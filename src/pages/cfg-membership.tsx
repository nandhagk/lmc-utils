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
  test: z.string(),
  cfg: z.string(),
});

export function CFGMembership() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      alphabet: "a,b",
      test: "aabb",
      cfg: "S -> a S b | ~",
    },
  });

  const [isAccepted, setIsAccepted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/cfg-membership.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<{ success: boolean; isAccepted: boolean }>) => {
      const { success } = e.data;

      if (!success) {
        setIsOpen(false);
        toast.error("Parse failure!", { richColors: true });
      } else {
        const { isAccepted } = e.data;

        setIsAccepted(isAccepted);
        setIsLoading(false);
      }
    };

    setWorker(worker);

    return () => worker.terminate();
  }, []);

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
                    <h1 className="text-2xl font-bold">CFG Membership</h1>
                    <p className="text-balance text-muted-foreground">Check CFG Membership</p>
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
                    <Label htmlFor="test">Test</Label>
                    <FormField
                      control={form.control}
                      name="test"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input id="test" className="font-mono" placeholder="Test" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cfg">CFG</Label>
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
            <DialogTitle>{isLoading ? "Processing" : isAccepted ? "Accepted" : "Not Accepted"}</DialogTitle>
          </DialogHeader>
          {isLoading && <Spinner />}
        </DialogContent>
      </Dialog>
    </>
  );
}
