
## [x] Controle manual do navegador do agente

O cabeçalho do computador agora oferece “Assumir controle”. Ao ativar, o iframe proxy recebe eventos de ponteiro, o cursor do agente é ocultado, aparece uma indicação de controle manual e o usuário pode navegar/interagir diretamente; o mesmo botão devolve o controle ao agente. O Preview foi validado alternando os dois estados pela interface.

## [x] Remoção do componente escuro duplicado da timeline

O wrapper externo do ThinkingState deixou de receber o atributo de fundo de componente, mantendo apenas o card da timeline e eliminando a faixa escura residual acima/abaixo da animação. Lint e build passaram.
