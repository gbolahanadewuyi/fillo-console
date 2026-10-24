import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount what each test rendered so the next one starts from an empty page.
afterEach(() => cleanup());
