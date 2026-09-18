// ============================================================
// 📦 THEME MODULE - Panario (Con persistencia en BD y mejoras)
// ============================================================

let currentTheme = 'light';
let themeInitialized = false;
let themeTransitioning = false;

// Inicializar tema desde la base de datos
async function initTheme() {
    try {
        const user = window.AuthModule?.getCurrentUser();
        
        // Si hay usuario, obtener tema desde la base de datos
        if (user && user.id) {
            const dbTheme = await window.AuthModule.getUserTheme(user.id);
            // Si el tema en BD es diferente al de la sesión, actualizar
            if (dbTheme && dbTheme !== user.theme) {
                user.theme = dbTheme;
                window.AuthModule.setCurrentUser(user);
            }
            currentTheme = user.theme || 'light';
            applyTheme(currentTheme, false);
            themeInitialized = true;
            console.log(`🌓 Tema cargado desde BD: ${currentTheme}`);
            return;
        }
        
        // Si no hay usuario, usar preferencia del sistema o light
        const saved = localStorage.getItem('panario-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        currentTheme = theme;
        applyTheme(theme, false);
        themeInitialized = true;
        console.log(`🌓 Tema inicializado: ${theme} (sin usuario)`);
        
    } catch (error) {
        console.warn('Error inicializando tema, usando light:', error);
        currentTheme = 'light';
        applyTheme('light', false);
        themeInitialized = true;
    }
}

// Aplicar tema con transición suave
function applyTheme(theme, animate = true) {
    if (themeTransitioning && animate) return;
    
    if (animate) {
        themeTransitioning = true;
        // Añadir clase para transición suave
        document.documentElement.classList.add('theme-transitioning');
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('panario-theme', theme);
    currentTheme = theme;
    
    // Actualizar icono del botón de tema si existe
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    }
    
    // Actualizar meta tag de theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.content = theme === 'dark' ? '#1a1a1a' : '#f5a623';
    }
    
    if (animate) {
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
            themeTransitioning = false;
        }, 400);
    }
}

// Cambiar tema con animación
async function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Aplicar tema localmente
    applyTheme(newTheme, true);
    
    // Si hay usuario, guardar en la base de datos
    const user = window.AuthModule?.getCurrentUser();
    if (user && user.id) {
        const result = await window.AuthModule.updateUserTheme(user.id, newTheme);
        if (result.success) {
            console.log(`🌓 Tema guardado en BD: ${newTheme}`);
            // Mostrar notificación
            window.showToast(`🌓 Tema cambiado a ${newTheme === 'dark' ? 'oscuro' : 'claro'}`, 'info', 2000);
        } else {
            console.warn('⚠️ No se pudo guardar el tema en BD');
        }
    } else {
        // Si no hay usuario, guardar en localStorage
        localStorage.setItem('panario-theme', newTheme);
        console.log(`🌓 Tema guardado en localStorage: ${newTheme}`);
    }
}

// Obtener tema actual
function getCurrentTheme() {
    return currentTheme;
}

// Detectar cambios en preferencia del sistema
function watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
        // Solo si no hay usuario logueado
        const user = window.AuthModule?.getCurrentUser();
        if (!user) {
            const theme = e.matches ? 'dark' : 'light';
            applyTheme(theme, true);
            localStorage.setItem('panario-theme', theme);
        }
    });
}

// Exportar al objeto global
window.ThemeModule = {
    initTheme,
    applyTheme,
    toggleTheme,
    getCurrentTheme,
    watchSystemTheme
};

// Para compatibilidad con app.js
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.getCurrentTheme = getCurrentTheme;

console.log('📦 Theme Module cargado correctamente (modo oscuro mejorado)');