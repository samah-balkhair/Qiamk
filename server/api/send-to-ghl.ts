import { Request, Response } from "express";

const GOHIGHLEVEL_API_TOKEN = process.env.GOHIGHLEVEL_API_TOKEN;
const GOHIGHLEVEL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID;

export async function sendToGoHighLevel(req: Request, res: Response) {
  try {
    const { email, value1, value2, value3 } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!GOHIGHLEVEL_API_TOKEN || !GOHIGHLEVEL_LOCATION_ID) {
      console.error("GoHighLevel credentials not configured");
      return res.status(500).json({ error: "GoHighLevel not configured" });
    }

    // Format values as "Name: Definition"
    const formatValue = (value: { name: string; definition: string } | undefined) => {
      if (!value) return "";
      return `${value.name}: ${value.definition}`;
    };

    // Create or update contact in GoHighLevel using v2 API
    const contactData = {
      email,
      locationId: GOHIGHLEVEL_LOCATION_ID,
      customField: {
        value_1: formatValue(value1),
        value_2: formatValue(value2),
        value_3: formatValue(value3),
      },
      tags: ["values-matrix-completed"],
    };

    console.log("Sending to GoHighLevel:", { email, locationId: GOHIGHLEVEL_LOCATION_ID });

    const response = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOHIGHLEVEL_API_TOKEN}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify(contactData),
    });

    const responseText = await response.text();
    console.log("GoHighLevel response status:", response.status);
    console.log("GoHighLevel response:", responseText);

    if (!response.ok) {
      console.error("GoHighLevel API error:", responseText);
      // Don't fail the entire request if GoHighLevel fails
      return res.json({ 
        success: true, 
        ghlError: true,
        message: "Email sent successfully, but GoHighLevel sync failed" 
      });
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("Successfully sent to GoHighLevel:", result);
    } catch (parseError) {
      console.error("Failed to parse GoHighLevel response:", parseError);
      // Don't fail if we can't parse the response
      return res.json({ 
        success: true, 
        ghlError: true,
        message: "Email sent successfully, but GoHighLevel response was invalid" 
      });
    }

    return res.json({ success: true, contactId: result.contact?.id });
  } catch (error) {
    console.error("Error sending to GoHighLevel:", error);
    return res.status(500).json({ error: "Failed to send to GoHighLevel" });
  }
}

