import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { toast } from "sonner";

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
      start: "1",
      accept: "1,3",
      nfa: "1 2 a,b\n2 2 a\n2 3 b\n3 2 b\n3 1 a",
    },
  });

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

  const [regex, setRegex] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setIsOpen(true);

    worker.postMessage(data);
  }

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
                            <Input id="alphabet" placeholder="Alphabet" {...field} />
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
                            <Input id="start" placeholder="Start" {...field} />
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
                            <Input id="accept" placeholder="Accept" {...field} />
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
                            <Textarea id="nfa" placeholder="NFA" {...field} className="min-h-36" />
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
                <Textarea id="regex" defaultValue={regex} readOnly />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
