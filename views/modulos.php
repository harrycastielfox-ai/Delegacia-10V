<?php $pageTitle = 'Módulos — SIPI'; include __DIR__ . '/../includes/header.php'; ?>
<body class='min-h-screen flex w-full bg-background text-foreground'>
<?php include __DIR__ . '/../includes/sidebar.php'; ?>
<main class='flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden'><header class='mb-6'><h1 class='text-2xl font-bold'>Módulos do Sistema</h1><p class='text-sm text-muted-foreground'>Selecione um módulo para acessar suas funcionalidades</p></header>
<div class='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
<a href='/inqueritos.php' class='block'><div class='group relative h-full bg-card border border-border rounded-xl p-6 flex flex-col'><div class='text-lg font-bold'>INQUÉRITOS</div><p class='text-sm text-muted-foreground mt-2'>IP, APF, TCO, BOC e AIAI — controle de prazos, situações e equipes.</p></div></a>
<div class='group relative h-full bg-card border border-border rounded-xl p-6 flex flex-col opacity-95'><div class='text-lg font-bold'>VEÍCULOS APREENDIDOS</div><p class='text-sm text-muted-foreground mt-2'>Registro de veículos apreendidos, vínculo a procedimentos e devoluções.</p></div>
<div class='group relative h-full bg-card border border-border rounded-xl p-6 flex flex-col opacity-95'><div class='text-lg font-bold'>OBJETOS APREENDIDOS</div><p class='text-sm text-muted-foreground mt-2'>Cadastro e rastreio de objetos apreendidos vinculados a casos.</p></div>
</div></main></body></html>
