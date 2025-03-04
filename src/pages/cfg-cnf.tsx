import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const FormSchema = z.object({
  cfg: z.string(),
});

export function CFGCNF() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      cfg: "S -> A S A | a B\nA -> B | S\nB -> b | ~",
    },
  });

  const [cnf, setCNF] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/cfg-cnf.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ success: boolean; cnf: string }>) => {
      const { success } = e.data;

      if (!success) {
        setIsOpen(false);
        toast.error("Parse failure!", { richColors: true });
      } else {
        const { cnf } = e.data;

        setCNF(cnf);
        setIsLoading(false);
      }
    };

    setWorker(worker);

    return () => worker.terminate();
  }, []);

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);
    setIsOpen(true);

    worker?.postMessage(data);
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
                    <h1 className="text-2xl font-bold">CFG to CNF</h1>
                    <p className="text-balance text-muted-foreground">Convert CFG to Chomsky Normal Form</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="nfa">CFG</Label>
                    <FormField
                      control={form.control}
                      name="cfg"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea id="cfg" placeholder="CFG" {...field} className="min-h-36 font-mono" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="cursor-pointer w-full">
                    Convert
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isLoading ? "Processing" : "CNF"}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <Spinner />
          ) : (
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <pre className="text-wrap font-mono md:text-sm">{cnf}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
