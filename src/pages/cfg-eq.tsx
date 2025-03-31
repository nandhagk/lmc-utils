import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const FormSchema = z.object({
  alphabet: z.string(),
  cfg1: z.string(),
  cfg2: z.string(),
});

export function CFGEq() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      alphabet: "0,1,$",
      cfg1: `
A	-> 0 B 1 | 1 C 0
B	-> 0 B 0 | 1 D 1
C	-> $ 1 | 0 B 1 | 1 C 0
D	-> $ | 0 B 0 | 1 D 1
      `.trim(),
      cfg2: `
S -> T | U
T -> 1 $ 1 0 | 1 T 0
U -> 0 V 1 | 1 U 0
V -> 1 $ 1 | 0 V 0 | 1 V 1
      `.trim(),
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/cfg-eq.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ success: boolean; m1: string | null; m2: string | null }>) => {
      const { success } = e.data;

      if (!success) {
        setIsOpen(false);
        toast.error("Parse failure!", { richColors: true });
      } else {
        const { m1, m2 } = e.data;

        setM1(m1);
        setM2(m2);
        setNotEQ(m1 !== null || m2 !== null);

        setIsLoading(false);
      }
    };

    setWorker(worker);

    return () => worker.terminate();
  }, []);

  const [notEQ, setNotEQ] = useState(false);
  const [m1, setM1] = useState<string | null>(null);
  const [m2, setM2] = useState<string | null>(null);

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
                    <h1 className="text-2xl font-bold">CFG Equivalence</h1>
                    <p className="text-balance text-muted-foreground">Check (in)equivalence of CFGs</p>
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
                    <Label htmlFor="cfg1">CFG 1</Label>
                    <FormField
                      control={form.control}
                      name="cfg1"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea id="cfg1" placeholder="CFG 1" {...field} className="min-h-36 font-mono" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cfg2">CFG 2</Label>
                    <FormField
                      control={form.control}
                      name="cfg2"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea id="cfg2" placeholder="CFG 2" {...field} className="min-h-36 font-mono" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="cursor-pointer w-full">
                    Check
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
            <DialogTitle>{isLoading ? "Processing" : notEQ ? "Not Equivalent" : "Undecided"}</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {m1 !== null && (
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="m1">Matched by 1 but not by 2</Label>
                    <pre className="text-wrap font-mono md:text-sm">{m1 === "" ? "[empty-string]" : m1}</pre>
                  </div>
                </div>
              )}
              {m2 !== null && (
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="m2">Matched by 2 but not by 1</Label>
                    <pre className="text-wrap font-mono md:text-sm">{m2 === "" ? "[empty-string]" : m2}</pre>
                  </div>
                </div>
              )}
              {!notEQ && (
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">I checked all strings of length upto 15 and couldn't find a difference :(</div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
