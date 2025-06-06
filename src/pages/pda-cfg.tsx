import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GraphCanvas } from "@/components/graph/graph-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const FormSchema = z.object({
  start: z.string(),
  accept: z.string(),
  pda: z.string(),
});

export function PDACFG() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      start: "q1",
      accept: "q7",
      pda: `
q1 q2 ~,~ -> #
q2 q3 0,~ -> 1
q3 q3 0,~ -> 0
q3 q4 1,~ -> 1
q4 q4 1,~ -> 1
q4 q3 0,~ -> 0
q2 q5 1,~ -> 0
q5 q5 1,~ -> 0
q5 q3 0,~ -> 1
q4 q6 $,~ -> ~
q5 q6 $,~ -> 1
q6 q6 0,0 -> ~
q6 q6 1,1 -> ~
q6 q7 ~,# -> ~
      `.trim(),
    },
  });

  const graph = form.watch("pda");
  const selected = form.watch("accept");

  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/pda-cfg.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ success: boolean; cfg: string }>) => {
      const { success } = e.data;

      if (!success) {
        setIsOpen(false);
        toast.error("Parse failure!", { richColors: true });
      } else {
        const { cfg } = e.data;

        setCFG(cfg);
        setIsLoading(false);
      }
    };

    setWorker(worker);

    return () => worker.terminate();
  }, []);

  const [cfg, setCFG] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);
    setIsOpen(true);

    if (worker === null) {
      toast.error("Failed to load worker!", { richColors: true });
      return;
    }

    worker.postMessage(data);
  };

  return (
    <>
      <div className="flex flex-row flex-wrap items-center justify-center p-6 md:p-10">
        <div className="md:h-full flex-none max-w-sm md:max-w-3xl">
          <div className="flex flex-col gap-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">PDA to CFG</h1>
                    <p className="text-balance text-muted-foreground">Find CFG accepted by PDA</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="start">Start</Label>
                    <FormField
                      control={form.control}
                      name="start"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="start" className="font-mono" placeholder="Start" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accept">Accept</Label>
                    <FormField
                      control={form.control}
                      name="accept"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="accept" className="font-mono" placeholder="Accept" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pda">PDA</Label>
                    <FormField
                      control={form.control}
                      name="pda"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ScrollArea type="auto" className="max-h-60">
                              <Textarea id="pda" placeholder="PDA" {...field} className="min-h-60 font-mono" />
                            </ScrollArea>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="cursor-pointer w-full">
                    Find
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
        <GraphCanvas graph={graph} selected={selected.split(",").map((s) => s.trim())}></GraphCanvas>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isLoading ? "Processing" : "CFG"}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <Spinner />
          ) : (
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <pre className="text-wrap break-all font-mono md:text-sm">{cfg}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
