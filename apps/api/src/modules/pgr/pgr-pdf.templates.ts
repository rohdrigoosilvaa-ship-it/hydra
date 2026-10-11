/**
 * Textos institucionais padrão do PGR, transcritos do "PGR Modelo.pdf" (modelo
 * ProtecSeg, 63 páginas) — o PDF gerado reproduz esse documento. Nenhum dado
 * específico do cliente do modelo (razão social, CNPJ, GHEs, riscos, pendências)
 * foi copiado: só a redação institucional, igual para qualquer PGR.
 * Erros de grafia do original foram corrigidos na transcrição.
 */

export const SUMARIO = [
  "1 - INTRODUÇÃO",
  "2 - OBJETIVOS",
  "3 – ABRANGÊNCIA",
  "4 - DEFINIÇÕES.",
  "5 - ESTRATÉGIA E METODOLOGIA DE AÇÃO",
  "5.1 - ANTECIPAÇÃO",
  "5.2 – RECONHECIMENTO",
  "5.3 - AVALIAÇÃO DE RISCO",
  "6 - AMBIENTES, CARGOS E INVENTÁRIO DE RISCOS OCUPACIONAIS",
  "7 - DIVULGAÇÕES DO PROGRAMA",
  "8 - REGISTRO",
  "9 - GARANTIA DE IMPLEMENTAÇÃO DO PROGRAMA DE GERENCIAMENTO DE RISCO",
  "10 - CONSIDERAÇÕES GERAIS",
  "11 - RESPONSÁVEIS",
  "12 - ANEXOS",
];

export const INTRODUCAO = [
  "Este Documento foi elaborado de acordo com as diretrizes da NR 1, Portaria SEPRT nº 6.730, de 9 de março de 2020, DOU 12/03/20.",
  "O GRO - Gerenciamento de Riscos Ocupacionais deve constituir o PGR - Programa de Gerenciamento de Riscos deve contemplar ou estar integrado com planos, programas e outros documentos previstos na legislação de segurança e saúde no trabalho e faz parte de um conjunto de medidas mais amplas contidas nas demais normas regulamentadoras, o qual se articula, principalmente, com a NR 07, PCMSO - Programa de Controle Médico de Saúde Ocupacional.",
  "Este Documento contém o Inventário Geral dos Riscos relacionados às atividades existentes na empresa, compreendendo todas as categorias de riscos à segurança e saúde dos trabalhadores e constitui um dos documentos básicos do Programa de Gestão de Riscos, no que diz respeito ao reconhecimento e avaliação de riscos relacionados a agentes físicos, químicos, biológicos, ergonômicos e mecânicos.",
  "Atende às exigências da Norma Regulamentadora 09, no que diz respeito ao reconhecimento e avaliação de riscos relacionados a agentes químicos, físicos e biológicos.",
  "Atende as exigências da Norma Regulamentadora 17 - Ergonomia, indicando situações nas quais se faz necessário a realização de Análise Ergonômica do Trabalho complementares.",
  "Os dados constantes neste documento servem de base para a elaboração do Plano de Ação Anual de Segurança e Saúde do Trabalho, que contempla as ações de controle a serem mantidas, implementadas ou melhoradas, assim como as atividades de monitoramento das exposições.",
  "Os riscos identificados para cada grupo de trabalhadores expostos irão subsidiar a elaboração ou reformulação do PCMSO.",
];

export const OBJETIVOS_INTRO = "O objetivo deste Inventário Geral de Riscos é:";
export const OBJETIVOS = [
  "Caracterizar exposições a todas as condições perigosas e aos agentes potencialmente nocivos - químicos, físicos, biológicos e outros fatores estressores que constituem cargas de trabalho física e mental significativas.",
  "Caracterizar a intensidade e a variação temporal das exposições para todos os trabalhadores - próprios e de contratadas que atuem em atividades dentro dos limites da empresa.",
  "Avaliar os riscos potenciais à segurança e saúde de todos os trabalhadores.",
  "Priorizar e recomendar ações para controlar exposições que representem riscos inaceitáveis e intoleráveis. Registrar as avaliações ambientais realizadas na empresa.",
  "Comunicar os resultados do processo de levantamento de perigos e avaliação de riscos para todos os trabalhadores envolvidos.",
  "Manter o registro histórico das exposições para todos os trabalhadores de forma que problemas futuros de saúde possam ser analisados e gerenciados com base em informações reais de exposição.",
];

export const ABRANGENCIA_PARAGRAFOS = [
  "Este Programa abrangerá os riscos identificados no ambiente de trabalho da empresa, conforme estabelecido na NR 1 da Portaria 3214/78.",
  "O processo se inicia com a caracterização básica de cada unidade - processo e ambiente de trabalho, força de trabalho e agentes ambientais e estressores. Esses dados servem de base para definir os grupos homogêneos de exposição (GHE) e atividades não rotineiras ou de empresas contratadas, para os quais os riscos serão reconhecidos e avaliados.",
];
/** Termo em negrito + texto corrido. */
export const ABRANGENCIA_TIPOS: { term: string; text: string }[] = [
  { term: "FÍSICOS", text: ", dentre outros: ruído, vibrações, temperaturas anormais, pressões anormais, radiações ionizantes, radiações não ionizantes e umidade." },
  { term: "QUÍMICOS", text: ", dentre outros: névoa, neblinas, poeiras, fumos, gases e vapores." },
  { term: "BIOLÓGICOS", text: ", dentre outros: bactérias, fungos, protozoários e vírus." },
  { term: "MECÂNICOS", text: ", dentre outros: são potencialmente geradores de acidentes, como o arranjo físico deficiente; máquinas e equipamentos sem proteção; ferramentas inadequadas; ou defeituosas; eletricidade; incêndio ou explosão; animais peçonhentos; armazenamento inadequado, dentre outros." },
  { term: "ERGONÔMICOS", text: ", dentre outros: são todas as condições que afetam o bem-estar do indivíduo seja elas físicas mentais ou organizacionais. Podem ser compreendidas como fatores que interferem nas características psicofisiológicas do profissional, provocando desconfortos e problemas de saúde. São exemplos de riscos ergonômicos: levantamento de peso, ritmo excessivo de trabalho, monotonia, repetitividade, postura inadequada." },
];

export const DEFINICOES: { term: string; text: string }[] = [
  { term: "DANO -", text: " É a consequência de um perigo em termos de lesão, doença, ou uma combinação desses." },
  { term: "PERIGO -", text: " Fonte, situação ou ato com potencial para provocar danos humanos em termos de lesão, ou uma combinação dessas." },
  { term: "IDENTIFICAÇÃO DE PERIGOS", text: " – Processo de reconhecimento que um perigo existe, e de definição de suas características." },
  { term: "RISCO", text: " - Combinação da probabilidade de ocorrência de um evento perigoso ou exposição com a gravidade da lesão ou doença que pode ser causada pelo evento ou exposição." },
  { term: "AVALIAÇÃO DE RISCOS -", text: " Processo de avaliação de risco proveniente de perigo, levando em consideração a adequação de qualquer controle existente, e decidindo se o risco é ou não aceitável." },
  { term: "RISCO ACEITÁVEL", text: " - Risco que foi reduzido a um nível que pode ser tolerado pela empresa, levando em consideração suas obrigações legais e sua própria política de SST." },
  { term: "ESTIMATIVA DE RISCO", text: " - Processo para determinar a frequência ou a probabilidade e as consequências de um perigo." },
  { term: "NÍVEL DE AÇÃO -", text: " Corresponde a um valor a partir do qual devem ser iniciadas medidas preventivas de forma a minimizar a probabilidade de que as exposições à agentes ambientais ultrapasse os limites de tolerância. Agentes Químicos + 50% do LT (limite de tolerância), Ruído= dose 0,5." },
  { term: "LIMITE DE TOLERÂNCIA", text: " - LT - Concentração ou intensidade máxima ou mínima, relacionada à natureza e o tempo de exposição ao agente, que não causará dano à saúde do trabalho, durante sua vida laboral (item 15.1.5 da NR 15, Portaria 3214)." },
  { term: "VALOR TETO -", text: " Concentração que não pode ser excedida durante nenhum momento da exposição do trabalhador." },
  { term: "GRUPO HOMOGÊNEO DE EXPOSIÇÃO (GHE) -", text: " A “Caracterização Básica” é um conceito presente nas Estratégias de Amostragem da AIHA, e representa um processo inicial de conhecimentos, em Higiene Ocupacional, que vai permitir a estruturação das amostragens para todos os trabalhadores da empresa." },
];
export const DEFINICOES_FINAIS = [
  "Trata-se de conhecer as três vertentes da questão: os ambientes de trabalho, os trabalhadores expostos e os agentes ambientais.",
  "A partir desse estudo integrado, o profissional responsável pelos levantamentos será capaz de definir a unidade de trabalho, que são os grupos exposição similar- GES.",
  "Ou seja, depois de observar e conhecer as exposições, reunir os trabalhadores em grupos que possuem as mesmas chances de exposição a um dado agente. Essa “igualdade” provém do desenvolvimento de rotinas e tarefas essencialmente idênticas ou similares do ponto de vista da exposição.",
  "Observação.: A relação perigo e dano é a mesma de causa e efeito, ou seja, PERIGO = CAUSA. Exemplo: Ruído “PAIR” Dano = Efeito",
];

export const ESTRATEGIA = {
  antecipacao: "O responsável da empresa deverá assegurar que toda modificação e/ou novo projeto a ser implantado seja avaliado preliminarmente com relação a identificação de perigos e avaliação dos riscos potencialmente presentes.",
  reconhecimento: [
    "Para elaboração do reconhecimento foi realizada a caracterização de todos os trabalhadores: cargo, função na empresa, atividades que realizam, setores onde estão lotados, datas de admissão no setor, regime de revezamento, com o objetivo de estudar como eles se relacionam com os processos e com os agentes /perigos presentes nestes processos e no ambiente.",
    "Para cada setor da empresa então é feito um mapeamento dos processos e atividades existentes com o objetivo de identificar os grupos de trabalhadores que realizam atividades similares visando facilitar a identificação de perigos na empresa. A estes grupos de trabalhadores damos o nome de GES.",
    "Cada processo pode ser constituído de um ou mais GES, isto será determinado levando-se em conta a similaridade de cada atividade realizada e consequentemente quanto a exposição aos mesmos perigos.",
    "Em seguida caracteriza-se o ambiente de trabalho para cada GES: setor (local físico onde realiza suas atividades), verificando-se as condições sanitárias, iluminação, ventilação, estado de conservação, etc.",
    "Para cada GES então é realizado a identificação dos perigos levando em conta as atividades, máquinas equipamentos, ferramentas, toxicidade dos produtos químicos que utilizam, agentes e perigos presentes e a eficácia das medidas de proteção existentes. Em seguida realiza-se a avaliação qualitativa dos riscos e a priorização de ações e/ou avaliações necessárias ao seu controle.",
  ],
  avaliacaoEtapa1: "Esta primeira etapa representa o processo de conhecer os ambientes de trabalho, os trabalhadores expostos e os agentes ocupacionais.",
  classificacaoLabel: "Matriz de risco",
  matrizIntro: "A Matriz de Risco utilizada neste Programa de Gerenciamento de Riscos é uma matriz no formato 4x4. Esta matriz funciona para avaliações qualitativas e quantitativas, pois as tabelas de gradações sugeridas possuem as estimativas adequadas para ambas as avaliações.",
};

export const TABELA_PROBABILIDADE: { level: number; title: string; subtitle: string; line1: string; line2: string }[] = [
  { level: 1, title: "OCASIONAL", subtitle: "Improvável", line1: "Até 25% da jornada", line2: "Improvável de ocorrer o evento (<2%)" },
  { level: 2, title: "INTERMITENTE", subtitle: "Pouco provável", line1: "De 26% até 50% da Jornada de trabalho", line2: "Pouco provável de ocorrer o evento (2% - <10%)" },
  { level: 3, title: "HABITUAL", subtitle: "Provável", line1: "De 51% até 75% da Jornada de trabalho", line2: "Provável de ocorrer o evento (>10% -50%)" },
  { level: 4, title: "PERMANENTE", subtitle: "Muito provável", line1: "Acima de 75% da jornada de trabalho", line2: "Muito provável de ocorrer o evento (>50%)" },
];

export const TABELA_POTENCIAL_DANO: { level: number; title: string; subtitle: string; risk: string }[] = [
  { level: 1, title: "LEVE", subtitle: "Dano insignificante", risk: "Risco Leve" },
  { level: 2, title: "MODERADO", subtitle: "Sem afastamento", risk: "Risco Moderado" },
  { level: 3, title: "SÉRIO", subtitle: "Com afastamento", risk: "Risco Sério" },
  { level: 4, title: "SEVERO", subtitle: "Morte / Irreversível", risk: "Risco Severo" },
];

export const TEXTO_NIVEIS =
  "Os níveis de risco presentes na matriz são 5 (cinco): Insignificante (1); Baixo (2-4); Médio (4-6); Alto (8-12) e Crítico (16). Cada nível de risco possui o seu método de controle sugerido, baseado na estimativa (grau de certeza) da avaliação, onde os riscos de níveis mais altos têm prioridade de ação.";

/** Matriz 4x4: linhas = probabilidade 1..4, colunas = severidade 1..4. */
export const MATRIZ_RISCO: { value: number; label: string }[][] = [
  [{ value: 1, label: "Irrelevante" }, { value: 2, label: "Baixo" }, { value: 3, label: "Baixo" }, { value: 4, label: "Médio" }],
  [{ value: 2, label: "Baixo" }, { value: 4, label: "Baixo" }, { value: 6, label: "Médio" }, { value: 8, label: "Alto" }],
  [{ value: 3, label: "Baixo" }, { value: 6, label: "Médio" }, { value: 9, label: "Alto" }, { value: 12, label: "Alto" }],
  [{ value: 4, label: "Médio" }, { value: 8, label: "Alto" }, { value: 12, label: "Alto" }, { value: 16, label: "Crítico" }],
];

export const MATRIZ_LEGENDA = "Eixo vertical: FREQUÊNCIA / PROBABILIDADE. Eixo horizontal: SEVERIDADE / POTENCIAL DE DANO.";

export const EXEMPLO_APLICACAO = [
  { term: "Probabilidade", text: ": ruído ocupacional de 40 dB, permitido para 8 horas de atividade, classificando-o como probabilidade de nível 2 (pouco provável), de acordo com a tabela de gradação." },
  { term: "Severidade", text: ": a severidade de uma doença que possa surgir de um ruído ocupacional classifica-se como “Lesão ou doenças críticas irreversíveis que podem limitar a capacidade funcional”, de acordo com a tabela sugerida, classificando-a como severidade de nível 2 (Moderado)." },
  { term: "Nível do Risco", text: ": o nível do risco é a probabilidade x (vezes) a severidade. No caso, 2 x 2, resultando em 4 (Risco baixo) de acordo com a matriz." },
];

export const METODOS_CONTROLE =
  "Os métodos de controle são classificados de acordo com o nível do risco e grau de certeza da estimativa da avaliação. Os níveis de risco mais altos devem ter prioridade na ação de controle. A ação de controle é classificada de acordo com o cálculo exposto na Matriz de risco seguindo a tabela abaixo.";

/** Cada linha: valor G.R. + cor + texto. cor: green1 (verde-claro), green, yellow, orange, red. */
export const MEDIDAS_SUGERIDAS: { value: number; color: "green1" | "green" | "yellow" | "orange" | "red"; text: string }[] = [
  { value: 1, color: "green1", text: "Não prioritário. Manter as medidas melhoria contínua. Pode ser necessária avaliação quantitativa para confirmação da categoria, a critério do profissional responsável pelo levantamento de informações." },
  { value: 2, color: "green", text: "Não prioritário. Manter as medidas melhoria contínua. Pode ser necessária avaliação quantitativa para confirmação da categoria, a critério do profissional responsável pelo levantamento de informações." },
  { value: 2, color: "yellow", text: "Prioridade básica. Iniciar processo de avaliação quantitativa para confirmação, quando possível, da categoria e monitoramento periódico (Controle Estatístico). Planejamento de medidas de controle." },
  { value: 3, color: "green", text: "Não prioritário. Manter as medidas melhoria contínua. Pode ser necessária avaliação quantitativa para confirmação da categoria, a critério do profissional responsável pelo levantamento de informações." },
  { value: 4, color: "green", text: "Não prioritário. Manter as medidas melhoria contínua. Pode ser necessária avaliação quantitativa para confirmação da categoria, a critério do profissional responsável pelo levantamento de informações." },
  { value: 4, color: "yellow", text: "Prioridade média. Adotar medidas de controle para redução da exposição ou probabilidade de dano e iniciar processo de avaliação quantitativa quando possível. Implementar medidas de controle." },
  { value: 6, color: "yellow", text: "Prioridade média. Adotar medidas de controle para redução da exposição ou probabilidade de dano e iniciar processo de avaliação quantitativa quando possível. Implementar medidas de controle." },
  { value: 8, color: "orange", text: "Prioridade média. Adotar medidas de controle para redução da exposição ou probabilidade de dano e iniciar processo de avaliação quantitativa quando possível. Implementar medidas de controle." },
  { value: 9, color: "orange", text: "Prioridade preferencial. Adotar medidas imediatas de controle. Iniciar processo de avaliação quantitativa, quando possível, para verificação do rebaixamento da categoria de risco." },
  { value: 12, color: "orange", text: "Prioridade preferencial. Adotar medidas imediatas de controle. Iniciar processo de avaliação quantitativa, quando possível, para verificação do rebaixamento da categoria de risco." },
  { value: 16, color: "red", text: "Prioridade máxima. Retirada do exposto do local e paralisação da atividade /processo. Realização de reunião extraordinária para propor medidas de melhorias." },
];

export const MEDIDAS_NOTA =
  "Esta classificação padrão dos métodos de controle funciona apenas para o Inventário de Riscos e não deve ser adotada como método único para o Plano de Ação. Contudo, como as ações de controle serão feitas baseadas no inventário, estas classificações servem para definir a prioridade das ações.";

export const DIVULGACOES = [
  "Os documentos e os procedimentos operacionais que integram o Programa de Gerenciamento de Risco (PGR) estarão disponíveis aos empregados nas respectivas áreas de atuação.",
  "A atualização do PGR será realizada quando da ocorrência de alterações significativas de ordem tecnológica, operacional, legal ou regulatória que provoquem a necessidade de adequação dos documentos que o integram ou ainda quando for recomendado na auditoria anual.",
  "Cabe aos responsáveis pelas respectivas áreas procederem a divulgação das atualizações dos documentos que integram o PGR, após as devidas aprovações, respeitadas eventuais restrições para o manuseio e circulação quando se tratar de documentos controlados.",
];

export const REGISTRO = [
  "O histórico das atualizações do PGR deve ser mantido por um período mínimo de 20 (vinte) anos ou pelo período estabelecido em normatização específica - NR-1.5.7.3.3.1.",
  "O PGR deve ser apresentado à CIPA - Comissão Interna de Prevenção de Acidentes durante uma de suas reuniões, devendo sua cópia ser anexada ao livro de atas desta comissão.",
];

export const GARANTIA_IMPLEMENTACAO =
  "O acompanhamento e desenvolvimento deste programa deverá ser de responsabilidade do preposto e ou coordenador da empresa, qual deverá implementar as ações e promover as condições e recursos necessários para a execução do planejamento anual, podendo este delegar e ou contratar terceiros para este fim.";

export const CONSIDERACOES_GERAIS = [
  "Procuramos em nossos trabalhos, optar pela imparcialidade, justificando os resultados e conclusões com a legislação vigente. Esperamos que este seja útil para a finalidade a que se destina que as dúvidas sejam encaminhadas aos responsáveis pela elaboração, para os devidos esclarecimentos, e que possíveis sugestões sejam apresentadas para o seu aperfeiçoamento.",
  "Ao final, o que esperamos é a satisfação do nosso cliente e que o trabalho seja simples e objetivo, ao alcance de qualquer intelecto, porém correto na linguagem, isento de textos sem significado prático e atendendo em sua plenitude ao propósito a que se destina, preservar a vida e a saúde do trabalhador.",
  "Cabe salientar que, implantação e o gerenciamento do PGR - Programa de Gerenciamento de Risco é de responsabilidade da empresa. Recomendamos que sejam conferidos os dados constantes do presente documento, e não havendo discordância no prazo de 15 dias, contados a partir desta data, entenderemos ter sido o mesmo conferido e aceito, ficando assim sob a Vossa responsabilidade a implantação deste programa.",
];

export const CONSIDERACOES_DESTAQUE =
  "O PGR deverá ser renovado anualmente assim como o PCMSO, seguindo o cronograma de ações e validade da visita técnica anual para validação das informações.";

export const PENDENCIAS_INTRO =
  "Registram-se as informações que dependem de dado não disponível nos documentos fornecidos e que devem ser complementadas pela empresa:";

export const RESPONSAVEIS_TEXTO =
  "O profissional abaixo assinado, é o responsável técnico pela elaboração deste documento, cabendo à empresa a responsabilidade pela implementação.";

export const ANEXOS_LISTA = [
  "MODELO DE FICHA DE EPI;",
  "CRONOGRAMA DE AÇÕES;",
  "CERTIFICADO DE CALIBRAÇÃO DO EQUIPAMENTO DE MEDIÇÃO;",
];

export const FICHA_EPI_DECLARACAO_INTRO =
  "Declaro para todos os efeitos legais, que recebi os equipamentos de proteção acima relacionados, em perfeitas condições de uso e com as devidas instruções sobre seu uso adequado, comprometendo-me a mantê-los em perfeito estado de conservação, ficando ciente de que:";
export const FICHA_EPI_ITENS = [
  "Se o equipamento for danificado ou inutilizado por emprega inadequada, mau uso, negligência ou extravio, a empresa me fornecerá novo equipamento e cobrará o valor de um equipamento da mesma marca ou equivalente ao da praça (parágrafo único do art. 462 da CLT).",
  "Fico proibido dar, ou emprestar o equipamento, que estiver sob minha responsabilidade, a menos que receber ordem por escrito da pessoa autorizada para tal fim.",
  "Em caso de dano, inutilização ou extravio de algum dos equipamentos, deverei comunicar imediatamente ao setor competente.",
  "Terminando os serviços, ou no caso de rescisão do contrato de trabalho, devolverei o equipamento completo e em perfeito estado de conservação, considerando-se o tempo do uso do mesmo, ao setor competente.",
  "Estando os equipamentos em minha posse, estarei sujeito a inspeções sem prévio aviso.",
  "Fico ciente de que não utilizando o equipamento de proteção individual em serviço estarei sujeito às sanções disciplinares cabíveis que irão desde simples advertências até a dispensa por justa causa nos termos do art. 482 da CLT combinado com a NR-6 da Portaria 3.214/78.",
];
export const FICHA_EPI_TREINAMENTO =
  "Recebi treinamento quanto à necessidade da utilização dos referidos EPI'S, a maneira correta de usá-los, higienizá-los e guardá-los, bem como, da minha responsabilidade quanto a seu uso, conforme determinado na NR-6, da Portaria 3.214/78.";
export const FICHA_EPI_ACORDO = "Declaro estar de acordo com todos os termos presentes neste recibo, que agora dato e assino.";
