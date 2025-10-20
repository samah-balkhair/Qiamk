import { Request, Response } from "express";

const GOHIGHLEVEL_API_TOKEN = process.env.GOHIGHLEVEL_API_TOKEN;
const GOHIGHLEVEL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID;

export async function sendToGoHighLevel(req: Request, res: Response) {
  try {
    const { name, email, phone, topValue1, topValue2, topValue3 } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    if (!GOHIGHLEVEL_API_TOKEN || !GOHIGHLEVEL_LOCATION_ID) {
      console.error("GoHighLevel credentials not configured");
      return res.status(500).json({ error: "GoHighLevel not configured" });
    }

    // Create or update contact in GoHighLevel
    const contactData = {
      firstName: name.split(" ")[0] || name,
      lastName: name.split(" ").slice(1).join(" ") || "",
      email,
      phone: phone || "",
      locationId: GOHIGHLEVEL_LOCATION_ID,
      customFields: [
        {
          key: "top_value_1",
          value: topValue1 || "",
        },
        {
          key: "top_value_2",
          value: topValue2 || "",
        },
        {
          key: "top_value_3",
          value: topValue3 || "",
        },
      ],
      tags: ["values-matrix-completed"],
    };

    const response = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOHIGHLEVEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GoHighLevel API error:", errorText);
      throw new Error(`GoHighLevel API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Successfully sent to GoHighLevel:", result);

    return res.json({ success: true, contactId: result.contact?.id });
  } catch (error) {
    console.error("Error sending to GoHighLevel:", error);
    return res.status(500).json({ error: "Failed to send to GoHighLevel" });
  }
}

