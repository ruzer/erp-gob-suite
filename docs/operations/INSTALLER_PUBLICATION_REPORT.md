# Installer Publication Report

## Estado del dominio

- Dominio objetivo: `install.erp-gob.com`
- Estado actual del código: listo para publicación
- Estado del hosting público: pendiente hasta desplegar en VPS y apuntar DNS

## URL final esperada

- `https://install.erp-gob.com`
- `https://install.erp-gob.com/install.sh`
- `https://install.erp-gob.com/version`

## Comandos de prueba

```bash
curl -I https://install.erp-gob.com/install.sh
curl -sSL https://install.erp-gob.com/install.sh | bash
erp-gob version
erp-gob install demo
erp-gob validate
erp-gob smoke
```

## Verificación HTTPS

Validaciones mínimas:

```bash
curl -I https://install.erp-gob.com/install.sh
curl -sSL https://install.erp-gob.com/version
```

Resultado esperado:

- certificado TLS válido
- respuesta `200`
- contenido servido como `text/plain`

## Estado final del installer

- CLI global soportado: `erp-gob`
- comando de bootstrap remoto soportado: `curl -sSL https://install.erp-gob.com | bash`
- perfiles soportados:
  - `demo`
  - `piloto`
  - `prod`
- comandos post-instalación:
  - `erp-gob install demo`
  - `erp-gob validate`
  - `erp-gob smoke`

## Bloqueo residual

La publicación pública depende de:

1. VPS con Caddy desplegado
2. DNS `install.erp-gob.com`
3. ejecución de `installer/publish/update_installer.sh`

Sin esos tres elementos, el installer está listo pero no publicado.
