export class DomainResponseDto {
  id: string;
  name: string;
  status: string;
  spfConfigured: boolean;
  dkimConfigured: boolean;
  dmarcConfigured: boolean;
  returnPathCname?: string;
  trackingCname?: string;
  created: string;
  updated: string;
}


