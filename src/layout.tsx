import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Fragment, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";

const pathMap = new Map<string, string[]>([
  ["/", ["Home"]],
  ["/regex-eq", ["Finite Automata", "RegEx Equivalence"]],
  ["/nfa-regex", ["Finite Automata", "NFA to RegEx"]],
  ["/cfg-cnf", ["Pushdown Automata", "CFG to CNF"]],
  ["/pda-cfg", ["Pushdown Automata", "PDA to CFG"]],
]);

export function Layout() {
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState(["Home"]);

  useEffect(() => void setBreadcrumbs(pathMap.get(location.pathname)!), [location]);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((title, i) =>
                  i === breadcrumbs.length - 1 ? (
                    <BreadcrumbItem key={i}>
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : (
                    <Fragment key={i}>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink>{title}</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                    </Fragment>
                  )
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
