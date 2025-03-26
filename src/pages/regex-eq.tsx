import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const FormSchema = z.object({
  alphabet: z.string(),
  regex1: z.string(),
  regex2: z.string(),
});

export function RegexEq() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      alphabet: "a,b",
      regex1: "(a(ba)*)*",
      regex2: "((a|(ab))*a)?",
    },
  });

  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/regex-eq.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ success: boolean; m1: string | null; m2: string | null }>) => {
      const { success } = e.data;

      if (!success) {
        setIsOpen(false);
        toast.error("Parse failure!", { richColors: true });
      } else {
        const { m1, m2 } = e.data;

        setM1(m1);
        setM2(m2);
        setEQ(m1 === null && m2 === null);

        setIsLoading(false);
      }
    };

    setWorker(worker);

    return () => worker.terminate();
  }, []);

  const [eq, setEQ] = useState(true);
  const [m1, setM1] = useState<string | null>(null);
  const [m2, setM2] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);
    setIsOpen(true);

    worker?.postMessage(data);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <div className="max-w-sm md:max-w-3xl">
          <div className="flex flex-col gap-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">RegEx Equivalence</h1>
                    <p className="text-balance text-muted-foreground">Check equivalence of Regular Expressions</p>
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
                    <Label htmlFor="regex1">Regular Expression 1</Label>
                    <FormField
                      control={form.control}
                      name="regex1"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="regex1" className="font-mono" placeholder="Regular Expression" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="regex1">Regular Expression 2</Label>
                    <FormField
                      control={form.control}
                      name="regex2"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="regex2" className="font-mono" placeholder="Regular Expression" {...field} />
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
            <DialogTitle>{isLoading ? "Processing" : eq ? "Equivalent" : "Not Equivalent"}</DialogTitle>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
