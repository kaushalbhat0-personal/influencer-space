"use client";

import { useCallback } from "react";
import { contentAppService } from "@/lib/application/content-app.service";
import type {
  ProductDTO,
  CreateProductDTO,
  UpdateProductDTO,
} from "@/lib/application/dtos/products";
import { useAsyncState, useMutation } from "./useAsyncState";

export function useProducts(initialProducts?: ProductDTO[]) {
  const products = useAsyncState<ProductDTO[]>(initialProducts ?? []);
  const createMutation = useMutation<CreateProductDTO, ProductDTO>();
  const updateMutation = useMutation<{ id: string; input: UpdateProductDTO }, ProductDTO>();
  const deleteMutation = useMutation<string, boolean>();
  const publishMutation = useMutation<string, ProductDTO>();
  const archiveMutation = useMutation<string, ProductDTO>();

  const refresh = useCallback(async (tenantId?: string) => {
    products.setLoading(true);
    try {
      if (tenantId) {
        const result = await contentAppService.getProducts(tenantId);
        if (result.success && result.data) {
          products.setData(result.data);
        } else {
          products.setError(result.error?.message ?? "Failed to load products");
        }
      }
    } catch (e) {
      products.setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      products.setLoading(false);
    }
  }, [products]);

  const create = useCallback(
    createMutation.execute(
      async (input: CreateProductDTO) => {
        const result = await contentAppService.createProduct(input);
        if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
        return result.data;
      }
    ),
    [createMutation]
  );

  const update = useCallback(
    updateMutation.execute(
      async ({ id, input }: { id: string; input: UpdateProductDTO }) => {
        const result = await contentAppService.updateProduct(id, input);
        if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
        return result.data;
      }
    ),
    [updateMutation]
  );

  const remove = useCallback(
    deleteMutation.execute(async (id: string) => {
      const result = await contentAppService.deleteProduct(id);
      if (!result.success) throw new Error(result.error?.message ?? "Failed");
      return true;
    }),
    [deleteMutation]
  );

  const publish = useCallback(
    publishMutation.execute(async (id: string) => {
      const result = await contentAppService.publishProduct(id);
      if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
      return result.data;
    }),
    [publishMutation]
  );

  const archive = useCallback(
    archiveMutation.execute(async (id: string) => {
      const result = await contentAppService.archiveProduct(id);
      if (!result.success || !result.data) throw new Error(result.error?.message ?? "Failed");
      return result.data;
    }),
    [archiveMutation]
  );

  return {
    products,
    refresh,
    create,
    update,
    remove,
    publish,
    archive,
    creating: createMutation.loading,
    updating: updateMutation.loading,
    deleting: deleteMutation.loading,
    publishing: publishMutation.loading,
    archiving: archiveMutation.loading,
  };
}
