<?php
require_once __DIR__ . '/includes/auth.php';

if (is_logged_in()) {
    header('Location: /modulos.php');
    exit;
}

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = trim((string)($_POST['usuario'] ?? ''));
    $senha = (string)($_POST['senha'] ?? '');

    if (attempt_login($usuario, $senha)) {
        header('Location: /modulos.php');
        exit;
    }

    $error = 'Usuário ou senha inválidos.';
}

include __DIR__ . '/views/index.php';
