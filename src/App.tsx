import { Layout } from "@/layout";
import { CFGCNF } from "@/pages/cfg-cnf";
import { Home } from "@/pages/home";
import { NFARegex } from "@/pages/nfa-regex";
import { RegexEq } from "@/pages/regex-eq";
import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/regex-eq" element={<RegexEq />} />
          <Route path="/nfa-regex" element={<NFARegex />} />
          <Route path="/cfg-cnf" element={<CFGCNF />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
