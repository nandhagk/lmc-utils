"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DFA } from "@/automaton/dfa";
import { NFA } from "@/automaton/nfa";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const FormSchema = z.object({
  regex1: z.string(),
  regex2: z.string(),
});

export function InputForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      regex1: "(a(ba)*)*",
      regex2: "((a|(ab))*a)?",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const { regex1, regex2 } = data;

    const A = new Set(["a", "b"]);

    const n1 = NFA.fromRegularExpression(A, regex1);
    const n2 = NFA.fromRegularExpression(A, regex2);

    const nfa = NFA.symmetricDifference(n2, n1);
    const dfa = DFA.fromNFA(nfa);

    console.log(dfa);

    if (dfa.F.size == 0) toast({ description: "Equivalent" });
    else toast({ variant: "destructive", description: "NOT Equivalent" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="regex1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regular Expression 1</FormLabel>
              <FormControl>
                <Input placeholder="(a(ba)*)*" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="regex2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regular Expression 2</FormLabel>
              <FormControl>
                <Input placeholder="((a|(ab))*a)?" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Check</Button>
      </form>
    </Form>
  );
}
