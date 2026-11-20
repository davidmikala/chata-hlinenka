/*
 * Vstupní bod: /admin = administrace fotek (Sanity Studio), jinak web.
 * Obě části se načítají zvlášť, takže návštěvník webu administraci nestahuje.
 */
const root = document.getElementById('root');

if (window.location.pathname.startsWith('/admin')) {
  import('./admin/Admin.jsx').then((m) => m.default(root));
} else {
  import('./site.jsx').then((m) => m.default(root));
}
