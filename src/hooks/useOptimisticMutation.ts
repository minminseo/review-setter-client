import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type OptimisticUpdateOptions<TData, TVariables> = {
  /**
   * 無効化するクエリキーの配列
   */
  queryKeysToInvalidate?: (string | (string | undefined)[])[];
  /**
   * 楽観的更新を実行する関数（オプション）
   */
  optimisticUpdate?: (data: TData, variables: TVariables) => void;
  /**
   * 成功時のカスタムメッセージ（オプション）
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  /**
   * 成功時の追加処理（オプション）
   */
  onSuccessCallback?: (data: TData, variables: TVariables) => void;
};

/**
 * 楽観的UI更新を含む一貫性のあるmutation処理を提供するカスタムフック
 * 
 * @param mutationFn - 実行するmutation関数
 * @param options - 楽観的更新のオプション
 * @returns useMutationの結果
 */
export const useOptimisticMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OptimisticUpdateOptions<TData, TVariables> = {}
) => {
  const queryClient = useQueryClient();
  const {
    queryKeysToInvalidate = [],
    optimisticUpdate,
    successMessage = 'Operation completed successfully',
    onSuccessCallback,
  } = options;

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // 1. 楽観的更新の実行
      optimisticUpdate?.(data, variables);

      // 2. クエリキャッシュの無効化
      queryKeysToInvalidate.forEach(queryKey => {
        if (Array.isArray(queryKey)) {
          // 配列の場合は要素をフィルタリングしてundefinedを除去
          const filteredKey = queryKey.filter(item => item !== undefined);
          queryClient.invalidateQueries({ queryKey: filteredKey });
        } else {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      });

      // 3. 成功メッセージの表示
      const message = typeof successMessage === 'function'
        ? successMessage(data, variables)
        : successMessage;
      toast.success(message);

      // 4. 成功時のカスタム処理
      onSuccessCallback?.(data, variables);
    },
    onError: (error: any) => {
      toast.error(`Operation failed: ${error.message}`);
    },
  });
};