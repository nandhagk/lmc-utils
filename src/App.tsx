import "@/App.css";
import { Layout } from "@/layout";
import { CFGCNF } from "@/pages/cfg-cnf";
import { CFGMembership } from "@/pages/cfg-membership";
import { Home } from "@/pages/home";
import { NFARegex } from "@/pages/nfa-regex";
import { PDACFG } from "@/pages/pda-cfg";
import { RegexEq } from "@/pages/regex-eq";
import { BrowserRouter, Route, Routes } from "react-router";
import { CFGEq } from "./pages/cfg-eq";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/regex-eq" element={<RegexEq />} />
          <Route path="/nfa-regex" element={<NFARegex />} />
          <Route path="/cfg-cnf" element={<CFGCNF />} />
          <Route path="/cfg-eq" element={<CFGEq />} />
          <Route path="/pda-cfg" element={<PDACFG />} />
          <Route path="/cfg-membership" element={<CFGMembership />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
