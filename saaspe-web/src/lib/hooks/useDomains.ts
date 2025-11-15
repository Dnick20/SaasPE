import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domainsApi, type ProvisionDomainPayload } from '../api/domains';

export function useProvisionDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProvisionDomainPayload) => domainsApi.provision(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
    },
  });
}


