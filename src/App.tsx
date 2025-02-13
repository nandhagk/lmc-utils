import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";
import { InputForm } from "./Form";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-100 max-w-sm md:max-w-3xl">
          <InputForm />
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
