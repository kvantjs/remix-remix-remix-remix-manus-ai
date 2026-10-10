# Trabalho em andamento — interface Manus AI

## Escopo confirmado
- [x] Referência visual e de interação: Manus AI no modo escuro.
- [x] Backend, runtime, APIs, banco e integrações existentes preservados.
- [x] Identidade visual aplicada na camada de frontend, sem afirmar que o serviço de execução é o Manus oficial.

## Concluído
- [x] Tela inicial ociosa centralizada; workspace não abre vazio ao iniciar.
- [x] Workspace sob demanda; desktop com chat e computador lado a lado.
- [x] Mobile com chat ou workspace em tela cheia, sem painel comprimido abaixo do chat.
- [x] Drawer e navegação mobile; nova tarefa e destinos conectados às superfícies existentes.
- [x] Composer com envio, parada, anexos suportados e ditado nativo.
- [x] Opções e conectores demonstrativos removidos; timeline segue eventos observáveis.
- [x] Estados de conclusão, falha, cancelamento, aprovação e espera separados.
- [x] Removidos ferramenta, log, sugestão e horário sintéticos sem dados reais.
- [x] Assets locais para o símbolo e telas vazias do computador.

## Verificado
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git diff --check`
- [x] Teste de browser com stream simulado: sucesso, falha e cancelamento; falha sem rótulo de ferramenta/conclusão inventados.
- [x] Teste mobile a 390 px: drawer, computador em tela cheia, sem overflow horizontal e execução iniciada mantendo o chat acessível.

## Próxima iteração
- [ ] Comparar tela a tela com as capturas e a gravação do Manus AI que você disse que enviará; ajustar a fidelidade visual fina com base nelas.
- [ ] A simulação local não substitui uma chamada end-to-end ao provedor real; o backend existente não foi alterado.
