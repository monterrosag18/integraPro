const ATTRIBUTE_NAMES = ['placeholder', 'aria-label', 'title', 'alt']
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA'])

const rules: Array<[RegExp, string]> = [
  [/Preparando tu universo\.\.\./g, 'Preparing your universe...'],
  [/El universo reconoce tu rol y abre solo la vista que te corresponde\./g, 'The universe recognizes your role and opens only your assigned view.'],
  [/Usa el correo y contrase\u00f1a asignados\. No hay registro: el rol viene directamente desde la base de datos\./g, 'Use your assigned email and password. There is no sign-up flow: your role comes directly from the database.'],
  [/No pudimos entrar al universo\./g, 'We could not enter the universe.'],
  [/ACCESO REAL B612/g, 'REAL B612 ACCESS'],
  [/\bACCESO\b/g, 'ACCESS'],
  [/Ingresa a tu planeta/g, 'Enter your planet'],
  [/La app consulta PostgreSQL remoto y redirige por rol: admin, TL o coder\./g, 'The app queries remote PostgreSQL and redirects by role: admin, TL, or coder.'],
  [/La app consulta PostgreSQL remoto and redirige por rol: admin, TL or coder\./g, 'The app queries remote PostgreSQL and redirects by role: admin, TL, or coder.'],
  [/Entrar al universo/g, 'Enter the universe'],
  [/Volver al universo/g, 'Back to the universe'],
  [/Correo institucional/g, 'Institutional email'],
  [/Contrase\u00f1a/g, 'Password'],
  [/Validando \u00f3rbita\.\.\./g, 'Validating orbit...'],
  [/UNA EXPERIENCIA PARA C\u00c9LULAS QUE CRECEN/g, 'AN EXPERIENCE FOR CELLS THAT GROW'],
  [/Viaja\./g, 'Travel.'],
  [/Construye\./g, 'Build.'],
  [/Florece\./g, 'Bloom.'],
  [/Comenzar viaje/g, 'Start the journey'],
  [/Buenos d\u00edas/g, 'Good morning'],
  [/Tu c\u00e9lula avanza por buen camino\./g, 'Your cell is moving in the right direction.'],
  [/Hay (\d+) historias esperando tu atenci\u00f3n\./g, 'There are $1 stories waiting for your attention.'],
  [/El crecimiento de tu equipo deja una huella\./g, 'Your team growth leaves a mark.'],
  [/\u00bfCu\u00e1ntos coders hay activos\?/g, 'How many coders are active?'],
  [/\u00bfQu\u00e9 sprints est\u00e1n en curso\?/g, 'Which sprints are running?'],
  [/\u00bfC\u00f3mo van los proyectos\?/g, 'How are the projects going?'],
  [/\u00bfQu\u00e9 es La Rosa en B612\?/g, 'What is The Rose in B612?'],
  [/\u00a1Hola! Soy B612 AI, tu asistente inteligente\. Puedo ayudarte con datos del sistema, aclarar conceptos de la plataforma o darte un resumen del estado actual\. \u00bfQu\u00e9 necesitas\?/g, 'Hi! I am B612 AI, your intelligent assistant. I can help with system data, explain platform concepts, or summarize the current state. What do you need?'],
  [/Pulso de la organizaci\u00f3n/g, 'Organization pulse'],
  [/Centro de control/g, 'Control center'],
  [/Una lectura clara de todo el universo acad\u00e9mico conectada a la base real\./g, 'A clear view of the academic universe connected to the real database.'],
  [/Crear cohorte/g, 'Create cohort'],
  [/Cohortes recientes/g, 'Recent cohorts'],
  [/Ver todas/g, 'View all'],
  [/Base real/g, 'Real database'],
  [/Datos desde PostgreSQL/g, 'Data from PostgreSQL'],
  [/Datos reales del VPS/g, 'Real VPS data'],
  [/Datos reales/g, 'Real data'],
  [/Sin registros para analizar/g, 'No records to analyze'],
  [/Talent Passport ya no usa muestras locales\. Cuando existan coders, asignaciones, historias o evaluaciones en PostgreSQL, el analisis se construira desde esos registros\./g, 'Talent Passport no longer uses local samples. Once coders, assignments, stories, or evaluations exist in PostgreSQL, the analysis will be built from those records.'],
  [/Buscar estudiante o c[e\u00e9]lula\.\.\./g, 'Search student or cell...'],
  [/Dashboard de/g, 'Employability'],
  [/Empleabilidad/g, 'Dashboard'],
  [/Integramos la capa analitica de la carpeta B-612: 24 KPIs, 6 dimensiones, scoring ponderado, tiers, gaps, trazabilidad e insights para direccion academica\./g, 'We integrate the B-612 analytics layer: 24 KPIs, 6 dimensions, weighted scoring, tiers, gaps, traceability, and insights for academic direction.'],
  [/Rama dev/g, 'dev branch'],
  [/Exportar/g, 'Export'],
  [/API real no disponible/g, 'Real API unavailable'],
  [/La API real respondio, pero no hay coders registrados para analizar\./g, 'The real API responded, but there are no coders registered to analyze.'],
  [/Score promedio/g, 'Average score'],
  [/Foco prioritario/g, 'Priority focus'],
  [/Ranking de empleabilidad/g, 'Employability ranking'],
  [/Distribucion/g, 'Distribution'],
  [/Scores por rango/g, 'Scores by range'],
  [/Ranking por c[e\u00e9]lula/g, 'Ranking by cell'],
  [/Cells activas/g, 'Active cells'],
  [/Modelo de score/g, 'Score model'],
  [/6 dimensiones/g, '6 dimensions'],
  [/Insight operativo/g, 'Operational insight'],
  [/Siguiente accion/g, 'Next action'],
  [/Priorizar/g, 'Prioritize'],
  [/El grupo puede subir el Employment Score si se refuerza la dimension mas baja y se acompanan coders con tier Bajo durante el siguiente sprint\./g, 'The group can raise the Employment Score by reinforcing the weakest dimension and supporting low-tier coders during the next sprint.'],
  [/Detalle por estudiante/g, 'Student detail'],
  [/Tabla de coders/g, 'Coder table'],
  [/Registros que sustentan el score/g, 'Records supporting the score'],
  [/Trazabilidad real/g, 'Real traceability'],
  [/Perfil individual/g, 'Individual profile'],
  [/Promedio grupo/g, 'Group average'],
  [/Radar vs grupo/g, 'Radar vs group'],
  [/Resumen ejecutivo/g, 'Executive summary'],
  [/Lectura del grupo/g, 'Group reading'],
  [/Reconocer y replicar/g, 'Recognize and replicate'],
  [/Plan de acci[o\u00f3]n/g, 'Action plan'],
  [/Pr[o\u00f3]ximo sprint/g, 'Next sprint'],
  [/KPIs pendientes/g, 'Pending KPIs'],
  [/Diferencia por dimension/g, 'Difference by dimension'],
  [/Cell seleccionada/g, 'Selected cell'],
  [/Ranking interno/g, 'Internal ranking'],
  [/Heatmap de dimensiones/g, 'Dimension heatmap'],
  [/Todos los coders/g, 'All coders'],
  [/Tablero de misi[o\u00f3]n/g, 'Mission board'],
  [/Arrastra las historias para actualizar su estado o abre cada card para editar su detalle\./g, 'Drag stories to update their status or open each card to edit its details.'],
  [/Criterios de aceptaci[o\u00f3]n, notas o bloqueos\.\.\./g, 'Acceptance criteria, notes, or blockers...'],
  [/Guardar historia/g, 'Save story'],
  [/Dise\u00f1a la pr[o\u00f3]xima tripulaci[o\u00f3]n/g, 'Design the next crew'],
  [/Los l[i\u00ed]deres permanecen anclados hasta que el TL decida cambiarlos\./g, 'Leaders stay anchored until the TL decides to change them.'],
  [/Cargando c[e\u00e9]lulas desde la base de datos\u2026/g, 'Loading cells from the database...'],
  [/No hay c[e\u00e9]lulas registradas para tu clan\./g, 'There are no cells registered for your clan.'],
  [/Dar rosa a esta c[e\u00e9]lula/g, 'Give a rose to this cell'],
  [/Cambiar l[i\u00ed]der/g, 'Change leader'],
  [/L[I\u00cd]DER ANCLADO/g, 'ANCHORED LEADER'],
  [/Rotaci[o\u00f3]n confirmada/g, 'Rotation confirmed'],
  [/Distribuci[o\u00f3]n lista para revisar/g, 'Distribution ready for review'],
  [/Confirmar rotaci[o\u00f3]n/g, 'Confirm rotation'],
  [/Confirmada/g, 'Confirmed'],
  [/Validaci[o\u00f3]n de rotaci[o\u00f3]n/g, 'Rotation validation'],
  [/Alertas de asignaci[o\u00f3]n/g, 'Assignment alerts'],
  [/C[e\u00e9]lula repetida/g, 'Repeated cell'],
  [/L[i\u00ed]der repetido/g, 'Repeated leader'],
  [/Sin recursos todav[i\u00ed]a\. Usa \u00abGestionar recursos\u00bb para agregar un Gist o una org\./g, 'No resources yet. Use "Manage resources" to add a Gist or an org.'],
  [/Gists y organizaciones/g, 'Gists and organizations'],
  [/Comparte gists de trabajo y orgs de GitHub para que todos los coders los vean\./g, 'Share work gists and GitHub orgs so every coder can see them.'],
  [/Control del TL/g, 'TL control'],
  [/Historial de sprints/g, 'Sprint history'],
  [/Ultimos registros/g, 'Latest records'],
  [/\u00daltimos registros/g, 'Latest records'],
  [/Entendido/g, 'Got it'],
  [/Centro de navegaci[o\u00f3]n/g, 'Navigation center'],
  [/Todo lo que necesitas para avanzar con tu c[e\u00e9]lula\./g, 'Everything you need to move forward with your cell.'],
  [/Ruta de la misi[o\u00f3]n/g, 'Mission route'],
  [/Fechas, objetivos y entregables visibles para toda la c[e\u00e9]lula\./g, 'Dates, goals, and deliverables visible to the whole cell.'],
  [/Objetivo del sprint/g, 'Sprint goal'],
  [/No hay proyectos asignados\./g, 'There are no assigned projects.'],
  [/Sin proyecto asignado/g, 'No assigned project'],
  [/Espera la asignaci[o\u00f3]n de tu TL\./g, 'Wait for your TL assignment.'],
  [/Trabajo de la c[e\u00e9]lula/g, 'Cell work'],
  [/Projects creados por el l[i\u00ed]der o el TL, con repositorio, ceremonias y avance desde la base real\./g, 'Projects created by the leader or TL, with repository, ceremonies, and progress from the real database.'],
  [/Repositorios del proyecto/g, 'Project repositories'],
  [/Sin repositorios a[u\u00fa]n\. Agrega el primero arriba\./g, 'No repositories yet. Add the first one above.'],
  [/Board interno/g, 'Internal board'],
  [/Flujo de la c[e\u00e9]lula/g, 'Cell workflow'],
  [/Haz clic en el t[i\u00ed]tulo para editar\./g, 'Click the title to edit.'],
  [/Ciclo Scrum/g, 'Scrum cycle'],
  [/Ceremonies de la semana/g, 'Weekly ceremonies'],
  [/Participa, consulta los acuerdos y deja evidencia del trabajo realizado\./g, 'Join, review agreements, and leave evidence of the work completed.'],
  [/Nueva ceremonia/g, 'New ceremony'],
  [/No hay ceremonias registradas para este proyecto a[u\u00fa]n\./g, 'There are no ceremonies registered for this project yet.'],
  [/Ver detalle/g, 'View detail'],
  [/Marcar completada/g, 'Mark completed'],
  [/Volver a programar/g, 'Schedule again'],
  [/Evaluaci[o\u00f3]n entre compa\u00f1eros/g, 'Peer evaluation'],
  [/Califica a tu c[e\u00e9]lula/g, 'Rate your cell'],
  [/De 1 a 5 estrellas por criterio\. An[o\u00f3]nimo para los coders; el TL ve los resultados del sprint\./g, 'Rate from 1 to 5 stars per criterion. Anonymous for coders; the TL sees sprint results.'],
  [/\u00bfA qui[e\u00e9]n eval[u\u00fa]as este sprint\?/g, 'Who are you evaluating this sprint?'],
  [/Selecciona un compa\u00f1ero para comenzar la evaluaci[o\u00f3]n\./g, 'Select a teammate to start the evaluation.'],
  [/No hay criterios de evaluaci[o\u00f3]n configurados\./g, 'There are no evaluation criteria configured.'],
  [/Tu promedio recibido/g, 'Your received average'],
  [/As[i\u00ed] te han calificado tus compa\u00f1eros de c[e\u00e9]lula en el sprint\./g, 'This is how your cell teammates rated you during the sprint.'],
  [/Las identidades de los evaluadores son an[o\u00f3]nimas para los coders\. El TL ve todos los resultados\./g, 'Evaluator identities are anonymous for coders. The TL can see all results.'],
  [/Coder full stack en formaci[o\u00f3]n\. Me apasiona convertir ideas en productos claros, accesibles y [u\u00fa]tiles\./g, 'Full-stack coder in training. I love turning ideas into clear, accessible, useful products.'],
  [/Foto de perfil de/g, 'Profile photo for'],
  [/Cambiar foto/g, 'Change photo'],
  [/Guardar perfil/g, 'Save profile'],
  [/Editar perfil/g, 'Edit profile'],
  [/Evaluaciones reales/g, 'Real evaluations'],
  [/Participaciones/g, 'Participation'],
  [/Entregas completadas/g, 'Completed deliveries'],
  [/Sprints y c[e\u00e9]lulas/g, 'Sprints and cells'],
  [/Logros reales/g, 'Real achievements'],
  [/Tu constelaci[o\u00f3]n sigue creciendo/g, 'Your constellation keeps growing'],
  [/L[i\u00ed]der de c[e\u00e9]lula/g, 'Cell leader'],
  [/Historias completadas/g, 'Completed stories'],
  [/Misi[o\u00f3]n del sprint/g, 'Sprint mission'],
  [/Acuerdos de la tripulaci[o\u00f3]n/g, 'Crew agreements'],
  [/Documentaci[o\u00f3]n del clan/g, 'Clan documentation'],
  [/Publicado para todas las c[e\u00e9]lulas/g, 'Published for all cells'],
  [/Contenido Markdown/g, 'Markdown content'],
  [/Lo esencial tambi[e\u00e9]n vive en lo que construimos juntos\./g, 'What is essential also lives in what we build together.'],
  [/Contin[u\u00fa]a aprendiendo, construyendo y creciendo con tu tripulaci[o\u00f3]n\./g, 'Keep learning, building, and growing with your crew.'],
  [/Sesi[o\u00f3]n real/g, 'Real session'],

  [/\bResumen\b/g, 'Overview'],
  [/\bCohortes\b/g, 'Cohorts'],
  [/\bCohorte\b/g, 'Cohort'],
  [/\bClanes\b/g, 'Clans'],
  [/\bUsuarios\b/g, 'Users'],
  [/\bUsuario\b/g, 'User'],
  [/\bCriterios\b/g, 'Criteria'],
  [/\bCriterio\b/g, 'Criterion'],
  [/\bRotaci[o\u00f3]n\b/g, 'Rotation'],
  [/\bC[e\u00e9]lulas\b/g, 'Cells'],
  [/\bC[e\u00e9]lula\b/g, 'Cell'],
  [/\bc[e\u00e9]lulas\b/g, 'cells'],
  [/\bc[e\u00e9]lula\b/g, 'cell'],
  [/\bL[i\u00ed]deres\b/g, 'Leaders'],
  [/\bL[i\u00ed]der\b/g, 'Leader'],
  [/\bl[i\u00ed]deres\b/g, 'leaders'],
  [/\bl[i\u00ed]der\b/g, 'leader'],
  [/\bTablero\b/g, 'Board'],
  [/\bProyectos\b/g, 'Projects'],
  [/\bProyecto\b/g, 'Project'],
  [/\bCeremonias\b/g, 'Ceremonies'],
  [/\bCeremonia\b/g, 'Ceremony'],
  [/\bDocumentaci[o\u00f3]n\b/g, 'Documentation'],
  [/\bEvaluaciones\b/g, 'Evaluations'],
  [/\bEvaluaci[o\u00f3]n\b/g, 'Evaluation'],
  [/\bevaluaci[o\u00f3]n\b/g, 'evaluation'],
  [/\bHistorias\b/g, 'Stories'],
  [/\bHistoria\b/g, 'Story'],
  [/\bhistorias\b/g, 'stories'],
  [/\bhistoria\b/g, 'story'],
  [/\bRosas\b/g, 'Roses'],
  [/\bRosa\b/g, 'Rose'],
  [/\bp[e\u00e9]talos\b/g, 'petals'],
  [/\btripulaci[o\u00f3]n\b/g, 'crew'],
  [/\bTripulaci[o\u00f3]n\b/g, 'Crew'],
  [/\bCorreo\b/g, 'Email'],
  [/\bNombre\b/g, 'Name'],
  [/\bEstado\b/g, 'Status'],
  [/\bEstudiante\b/g, 'Student'],
  [/\bNivel\b/g, 'Level'],
  [/\bEvidencia\b/g, 'Evidence'],
  [/\bCobertura\b/g, 'Coverage'],
  [/\bAsignaciones\b/g, 'Assignments'],
  [/\bDimensiones\b/g, 'Dimensions'],
  [/\bBrechas\b/g, 'Gaps'],
  [/\bInicio\b/g, 'Start'],
  [/\bFin\b/g, 'End'],
  [/\bAvance\b/g, 'Progress'],
  [/\bPromedio\b/g, 'Average'],
  [/\bBuscar\b/g, 'Search'],
  [/\bGuardar\b/g, 'Save'],
  [/\bCrear\b/g, 'Create'],
  [/\bAgregar\b/g, 'Add'],
  [/\bCancelar\b/g, 'Cancel'],
  [/\bCerrar\b/g, 'Close'],
  [/\bEditar\b/g, 'Edit'],
  [/\bExpandir\b/g, 'Expand'],
  [/\bSalir\b/g, 'Log out'],
  [/\bConfiguraci[o\u00f3]n\b/g, 'Settings'],
  [/\bNotificaciones\b/g, 'Notifications'],
  [/\bPreferencias\b/g, 'Preferences'],
  [/\bVista\b/g, 'View'],
  [/\bActualizado\b/g, 'Updated'],
  [/\bPublicado\b/g, 'Published'],
  [/\bBorrador\b/gi, 'Draft'],
  [/\bPUBLICADO\b/g, 'PUBLISHED'],
  [/\bBORRADOR\b/g, 'DRAFT'],
  [/\bSin datos\b/g, 'No data'],
  [/\bsin datos\b/g, 'no data'],
  [/\bSin sprint activo\b/g, 'No active sprint'],
  [/\bSin proyecto activo\b/g, 'No active project'],
  [/\bSin proyecto\b/g, 'No project'],
  [/\bSin c[e\u00e9]lula\b/g, 'No cell'],
  [/\bSin clan\b/g, 'No clan'],
  [/\bNo hay\b/g, 'There are no'],
  [/\bCargando\b/g, 'Loading'],
  [/\bGuardando\b/g, 'Saving'],
  [/\bEn curso\b/g, 'In progress'],
  [/\bCerrado\b/g, 'Closed'],
  [/\bPreparaci[o\u00f3]n\b/g, 'Preparation'],
  [/\bPor hacer\b/g, 'To do'],
  [/\bEn progreso\b/g, 'In progress'],
  [/\bEn revisi[o\u00f3]n\b/g, 'In review'],
  [/\bFinalizado\b/g, 'Done'],
  [/\bCompletadas\b/g, 'Completed'],
  [/\bcompletadas\b/g, 'completed'],
  [/\bregistradas\b/g, 'registered'],
  [/\bregistrados\b/g, 'registered'],
  [/\bregistros reales\b/g, 'real records'],
  [/\bde 10\b/g, 'of 10'],
  [/\bde 5\b/g, 'of 5'],
  [/\bde\b/g, 'of'],
  [/\bdel\b/g, 'of the'],
  [/\bla\b/g, 'the'],
  [/\bel\b/g, 'the'],
  [/\by\b/g, 'and'],
  [/\bo\b/g, 'or'],
  [/\bpara\b/g, 'for'],
  [/\bcon\b/g, 'with'],
  [/\bdesde\b/g, 'from'],
  [/\bhasta\b/g, 'until'],
  [/\ben\b/g, 'in'],
  [/\bd[i\u00ed]as\b/g, 'days'],
  [/\bd[i\u00ed]a\b/g, 'day'],
  [/\bm[a\u00e1]s\b/g, 'more'],
  [/\ba[u\u00fa]n\b/g, 'yet'],
  [/\bhoy\b/g, 'today'],
  [/\bene\b/gi, 'Jan'],
  [/\babr\b/gi, 'Apr'],
  [/\bago\b/gi, 'Aug'],
  [/\bdic\b/gi, 'Dec'],
]

function shouldSkip(node: Node | null) {
  let current = node?.parentElement
  while (current) {
    if (SKIP_TAGS.has(current.tagName)) return true
    current = current.parentElement
  }
  return false
}

function toEnglish(value: string) {
  let result = value
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement)
  }
  return result
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
}

function translateTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  nodes.forEach((node) => {
    if (!node.nodeValue || shouldSkip(node)) return
    const translated = toEnglish(node.nodeValue)
    if (translated !== node.nodeValue) node.nodeValue = translated
  })
}

function translateAttributes(root: ParentNode) {
  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'))
  elements.forEach((element) => {
    if (!(element instanceof HTMLElement)) return
    ATTRIBUTE_NAMES.forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) return
      const translated = toEnglish(value)
      if (translated !== value) element.setAttribute(attribute, translated)
    })
  })
}

function translateTree(root: ParentNode) {
  translateTextNodes(root)
  translateAttributes(root)
}

declare global {
  interface Window {
    __b612EnglishUiInstalled?: boolean
  }
}

export function installEnglishUi() {
  if (typeof window === 'undefined' || window.__b612EnglishUiInstalled) return
  window.__b612EnglishUiInstalled = true
  document.documentElement.lang = 'en'

  let scheduled = false
  const run = () => {
    scheduled = false
    if (document.body) translateTree(document.body)
  }
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(run)
  }

  schedule()
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTE_NAMES,
  })
}
