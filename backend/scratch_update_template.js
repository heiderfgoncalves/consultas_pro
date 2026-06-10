const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const templateId = 'cmpuh6oue0000u6omv22c0fjb'; // ID de "Import_test_1"
  
  // 1. Ler o score-section.json atualizado
  const scoreSectionPath = '/consultas-pro-app/docs/plan/score-section.json';
  const scoreSectionData = JSON.parse(fs.readFileSync(scoreSectionPath, 'utf8'));
  
  // 2. Buscar o template atual do banco de dados para backup e mesclagem
  const dbTemplate = await prisma.template.findUnique({
    where: { id: templateId }
  });
  
  if (!dbTemplate) {
    console.error('Template não encontrado no banco!');
    return;
  }
  
  const currentLayout = typeof dbTemplate.layout === 'string' 
    ? JSON.parse(dbTemplate.layout) 
    : dbTemplate.layout;
    
  // Fazer backup local do layout atual do banco
  const backupPath = '/consultas-pro-app/backend/template_layout_backup.json';
  fs.writeFileSync(backupPath, JSON.stringify(currentLayout, null, 2), 'utf8');
  console.log(`Backup do layout atual salvo com sucesso em: ${backupPath}`);
  
  // 3. Filtrar os elementos antigos relacionados à seção de score
  const scoreElementIds = new Set([
    "el_score_header_icon_p1",
    "el_score_header_text_p1",
    "el_score_header_div_p1",
    "el_score_card_bg_p1",
    "el_score_headline_p1",
    "el_score_subtitle_p1",
    "el_score_speedometer_p1",
    "el_score_det_icon1_p1",
    "el_score_det_text1_p1",
    "el_score_det_icon2_p1",
    "el_score_det_icon3_p1",
    "el_score_det_text3_p1",
    "el_score_ribbon_p1",
    "el_score_interpret_p1",
    "el_score_influ_bg_p1",
    "el_score_influ_icon_p1",
    "el_score_influ_body_p1",
    "el_score_diag_bg_p1",
    "el_score_diag_icon_p1",
    "text_vLS0v74C",
    "text_nVyX2Bfz",
    "text__5hEvfi3",
    "container_un2rHO6Q",
    "icon_DQaxcllQ",
    "text_38L2EySE",
    "text_EXcsOCJP",
    "text_xPu--xc3",
    "text_CuWRaAgh"
  ]);
  
  const filteredElements = currentLayout.elements.filter(el => {
    // Mantém os elementos que não são da seção de score
    return !scoreElementIds.has(el.id) && !el.id.startsWith('el_score_');
  });
  
  // 4. Adicionar os novos elementos
  const newElements = [...filteredElements, ...scoreSectionData];
  
  // 5. Montar o novo layout
  const newLayout = {
    ...currentLayout,
    elements: newElements
  };
  
  // 6. Atualizar no banco de dados
  await prisma.template.update({
    where: { id: templateId },
    data: {
      layout: newLayout
    }
  });
  
  console.log('Template "Import_test_1" atualizado com sucesso diretamente no banco de dados!');
}

main()
  .catch(e => {
    console.error('Erro ao atualizar template no banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
