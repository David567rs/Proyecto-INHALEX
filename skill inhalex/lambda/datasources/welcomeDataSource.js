const util = require('../util');

function getCurrentTime() {
    return new Date().toLocaleTimeString('es-MX', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function normalizeLines(lines) {
    const safeLines =
        lines && lines.length > 0
            ? lines
            : util.buildLines([]);

    return safeLines.map(function(line) {
        const lineTitle =
            line.lineTitle ||
            line.name ||
            util.getLineTitle(line.id);

        return Object.assign({}, line, {
            name: lineTitle,
            lineTitle: lineTitle
        });
    });
}

function welcomeDataSource(lines) {
    return {
        welcomeData: {
            type: 'object',
            logo: util.LOGO_URL,
            title: 'INHALEX Bienestar',
            subtitle: 'El respiro que alivia',
            headline: 'Encuentra el aroma ideal para ti',
            description: 'Explora nuestras líneas de aromas naturales y descubre productos pensados para tu bienestar.',
            instruction: 'Desliza para explorar • Toca una línea para ver sus aromas',
            footerText: 'Desliza o toca una línea.',
            timeText: getCurrentTime(),
            lines: normalizeLines(lines)
        }
    };
}

module.exports = welcomeDataSource;
