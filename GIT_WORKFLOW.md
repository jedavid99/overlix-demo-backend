# GIT WORKFLOW PARA PRODUCCIÓN EN RAILWAY

## ESTRUCTURA DE RAMAS

- **main**: Rama de producción (código estable, desplegado en Railway)
- **develop**: Rama de desarrollo (trabajo diario, características en desarrollo)

## CONFIGURACIÓN INICIAL

### 1. Inicializar Git (si no está inicializado)
```bash
git init
```

### 2. Crear rama develop desde el estado actual
```bash
git checkout -b develop
```

### 3. Agregar archivos al staging
```bash
git add .
```

### 4. Commit inicial
```bash
git commit -m "Initial commit: NestJS backend for TechRepair Pro"
```

### 5. Crear rama main
```bash
git checkout -b main
```

### 6. Volver a develop
```bash
git checkout develop
```

## FLUJO DE TRABAJO DIARIO

### Desarrollo en rama develop
```bash
# Asegurarse de estar en develop
git checkout develop

# Hacer cambios en el código
# ... editar archivos ...

# Ver cambios
git status

# Agregar archivos modificados
git add .

# Commit con mensaje descriptivo
git commit -m "feat: agregar funcionalidad X"
```

### Fusionar develop → main para producción
```bash
# Asegurarse de que develop esté actualizado
git checkout develop
git pull origin develop

# Cambiar a main
git checkout main

# Fusionar develop en main
git merge develop

# Push a main (esto desplegará en Railway)
git push origin main

# Volver a develop para continuar trabajando
git checkout develop
```

## COMANDOS GIT ÚTILES

### Ver ramas
```bash
git branch -a
```

### Ver historial de commits
```bash
git log --oneline --graph --all
```

### Ver diferencias
```bash
git diff
git diff main develop
```

### Deshacer cambios no commitados
```bash
git checkout -- archivo.ts
```

### Deshacer último commit (conservando cambios)
```bash
git reset --soft HEAD~1
```

### Deshacer último commit (eliminando cambios)
```bash
git reset --hard HEAD~1
```

## CONECTAR CON GITHUB

### 1. Crear repositorio en GitHub
- Ve a https://github.com/new
- Crea un nuevo repositorio (llámalo "techrepair-backend" o similar)
- NO inicializar con README, .gitignore o license

### 2. Conectar repositorio local con GitHub
```bash
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
```

### 3. Push inicial
```bash
# Push de develop
git checkout develop
git push -u origin develop

# Push de main
git checkout main
git push -u origin main
```

## CONFIGURACIÓN DE RAILWAY PARA AUTO-DEPLOY

### 1. Conectar Railway con GitHub
- Ve a https://railway.app
- Cuenta > New Project > Deploy from GitHub repo
- Selecciona tu repositorio

### 2. Configurar rama de despliegue
- En Settings > General > Branch
- Selecciona "main" como rama de despliegue

### 3. Habilitar auto-deploy
- En Settings > General > Deployments
- Habilita "Auto Deploy on Push to main"

## MENSAJES DE COMMIT (CONVENCIONAL COMMITS)

```bash
feat: agregar nueva funcionalidad
fix: corregir error en login
docs: actualizar documentación
style: formatear código
refactor: refactorizar código X
test: agregar pruebas
chore: actualizar dependencias
```

## EJEMPLO DE FLUJO COMPLETO

```bash
# 1. Iniciar nueva característica
git checkout develop

# 2. Hacer cambios
# ... editar archivos ...

# 3. Commit
git add .
git commit -m "feat: agregar endpoint para reparaciones"

# 4. Push a develop
git push origin develop

# 5. Cuando esté listo para producción
git checkout main
git merge develop
git push origin main

# 6. Railway desplegará automáticamente
# 7. Volver a develop
git checkout develop
```

## SOLUCIÓN DE PROBLEMAS

### Conflictos al fusionar
```bash
# Si hay conflictos al hacer merge
git merge develop
# Resolver conflictos manualmente
git add .
git commit -m "resolve: conflictos de merge con develop"
```

### Deshacer merge
```bash
git reset --hard HEAD~1
```

### Ver cambios pendientes de push
```bash
git status
git log origin/main..main
```
