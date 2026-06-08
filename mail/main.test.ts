import { Process } from "./main.ts";
import { assertEquals } from "@std/assert";

Deno.test("Process.v", () => {
	assertEquals(Process.v("foo=bar", "foo"), "bar");

	// always ask for lowercase
	assertEquals(Process.v("foo=bar", "FOO"), undefined);

	assertEquals(Process.v("a=1;b=2;c=3", "b"), "2");
	assertEquals(Process.v("a=1;b= 2;c=3", "b"), "2");
	assertEquals(Process.v("a=1; b=2 ; c=3", "b"), "2");
	assertEquals(Process.v('a="1";b=2;c=3', "a"), "1");

	assertEquals(Process.v('a="1=2"', "a"), "1=2");

	assertEquals(Process.v('a=1;b=2;c="3\\""', "c"), '3"');
	assertEquals(Process.v('a=1;b=2;c="3""', "c"), '3"');
});
