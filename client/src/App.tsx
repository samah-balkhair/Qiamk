import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Welcome from "./pages/Welcome";
import SelectValues from "./pages/SelectValues";
import CompareValues from "./pages/CompareValues";
import DefineValues from "./pages/DefineValues";
import Scenarios from "./pages/Scenarios";
import Results from "./pages/Results";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Welcome} />
      <Route path={"/select-values"} component={SelectValues} />
      <Route path={"/compare-values"} component={CompareValues} />
      <Route path={"/define-values"} component={DefineValues} />
      <Route path={"/scenarios"} component={Scenarios} />
      <Route path={"/results"} component={Results} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
