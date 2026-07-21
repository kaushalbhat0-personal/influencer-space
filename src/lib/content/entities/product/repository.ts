import type { Product } from "./types";
import { InMemoryBaseRepository } from "../../framework/base";

export class InMemoryProductRepository extends InMemoryBaseRepository<Product> {}

export const productRepository = new InMemoryProductRepository();
