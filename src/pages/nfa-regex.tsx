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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const FormSchema = z.object({
  alphabet: z.string(),
  start: z.string(),
  accept: z.string(),
  nfa: z.string(),
});

export function NFARegex() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      alphabet: "a,b",
      start: "q1",
      accept: "q1,q3",
      nfa: "q1 q2 a,b\nq2 q2 a\nq2 q3 b\nq3 q2 b\nq3 q1 a",
    },
  });

  const graph = form.watch("nfa");
  const selected = form.watch("accept");

  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/nfa-regex.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ success: boolean; regex: string }>) => {
      const { success } = e.data;

      if (!success) {
        setIsOpen(false);
        toast.error("Parse failure!", { richColors: true });
      } else {
        const { regex } = e.data;

        setRegex(regex);
        setIsLoading(false);
      }
    };

    setWorker(worker);

    return () => worker.terminate();
  }, []);

  const [regex, setRegex] = useState("");
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
                    <h1 className="text-2xl font-bold">NFA to RegEx</h1>
                    <p className="text-balance text-muted-foreground">Find regular expression accepted by NFA</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="alphabet">Alphabet</Label>
                    <FormField
                      control={form.control}
                      name="alphabet"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="alphabet" className="font-mono" placeholder="Alphabet" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
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
                    <Label htmlFor="nfa">NFA</Label>
                    <FormField
                      control={form.control}
                      name="nfa"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea id="nfa" placeholder="NFA" {...field} className="min-h-36 font-mono" />
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
            <DialogTitle>{isLoading ? "Processing" : "RegEx"}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <Spinner />
          ) : (
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <pre className="text-wrap break-all font-mono md:text-sm">{regex}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
