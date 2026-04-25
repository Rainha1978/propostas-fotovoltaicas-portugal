# Integracoes futuras

Esta pasta fica reservada para entradas e saidas externas. Nesta fase ainda nao ha chamadas a WhatsApp, Facebook ou email.

- `site`: receber formularios do site
- `facebook`: receber Facebook Lead Ads
- `whatsapp`: receber e enviar mensagens pela WhatsApp Business API
- `delivery`: enviar PDF por email ou WhatsApp

Todas as integracoes devem converter dados externos para o formato usado por `createLead` e chamar o motor de calculo apenas atraves de `calculateProposal`.
