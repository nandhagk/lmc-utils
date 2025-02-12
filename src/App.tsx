import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";
import { InputForm } from "./Form";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <InputForm />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
