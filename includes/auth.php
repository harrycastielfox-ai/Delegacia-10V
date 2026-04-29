<?php
require_once __DIR__ . '/db.php';

function ensure_session_started(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function is_logged_in(): bool
{
    ensure_session_started();
    return !empty($_SESSION['user_id']);
}

function require_auth(): void
{
    if (!is_logged_in()) {
        header('Location: /index.php');
        exit;
    }
}

function attempt_login(string $usuario, string $senha): bool
{
    ensure_session_started();

    $sql = 'SELECT id, usuario, senha FROM usuarios WHERE usuario = :usuario LIMIT 1';
    $stmt = db()->prepare($sql);
    $stmt->execute(['usuario' => $usuario]);
    $user = $stmt->fetch();

    if (!$user) {
        return false;
    }

    $stored = (string) $user['senha'];
    $valid = password_verify($senha, $stored) || hash_equals($stored, $senha);

    if (!$valid) {
        return false;
    }

    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['usuario'] = (string) $user['usuario'];
    return true;
}

function logout_user(): void
{
    ensure_session_started();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}
