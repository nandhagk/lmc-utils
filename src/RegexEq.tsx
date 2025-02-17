"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DFA } from "@/automaton/dfa";
import { NFA } from "@/automaton/nfa";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

const FormSchema = z.object({
  alphabet: z.string(),
  regex1: z.string(),
  regex2: z.string(),
});

export function RegexEq({ className, ...props }: React.ComponentProps<"div">) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      alphabet: "a,b",
      regex1: "(a(ba)*)*",
      regex2: "((a|(ab))*a)?",
    },
  });

  const [eq, setEQ] = useState<boolean>(true);
  const [m1, setM1] = useState<string | null>(null);
  const [m2, setM2] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsOpen(true);
    setIsLoading(true);
    const { alphabet, regex1, regex2 } = data;

    const A = new Set(alphabet.split(","));

    try {
      const n1 = NFA.fromRegularExpression(A, regex1);
      const n2 = NFA.fromRegularExpression(A, regex2);

      const d1 = DFA.fromNFA(NFA.difference(n1, n2));
      const d2 = DFA.fromNFA(NFA.difference(n2, n1));

      setM1(d1.findMatch());
      setM2(d2.findMatch());
      setEQ(d1.F.size === 0 && d2.F.size == 0);
    } catch {
      setIsOpen(false);

      toast({ variant: "destructive", description: "Parse failure!" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">RegEx Equivalence</h1>
                    <p className="text-balance text-muted-foreground">Check equivalence of regular expressions</p>
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
                    <Label htmlFor="regex1">Regular Expression 1</Label>
                    <FormField
                      control={form.control}
                      name="regex1"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="regex1" placeholder="Regular Expression" {...field} />
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
                            <Input id="regex2" placeholder="Regular Expression" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Check
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            {isLoading ? (
              <Spinner />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{eq ? "Equivalent" : "Not Equivalent"}</DialogTitle>
                </DialogHeader>
                {m1 !== null && (
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="m1">Matched by 1 but not by 2</Label>
                      <Input id="m1" defaultValue={m1} readOnly />
                    </div>
                  </div>
                )}
                {m2 !== null && (
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="m2">Matched by 2 but not by 1</Label>
                      <Input id="m2" defaultValue={m2} readOnly />
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
        <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          Made with ❤️ by <a href="https://github.com/nandhagk/lmc-utils">nandhagk</a>
        </div>
      </div>
    </>
  );
}
