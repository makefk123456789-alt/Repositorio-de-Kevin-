'use client'

import ProtectedLayout from '@/components/ProtectedLayout'
import { FiBook, FiUserPlus, FiRefreshCw, FiSearch, FiEdit, FiAlertCircle, FiCheck, FiUsers, FiHome, FiDollarSign, FiMessageSquare } from 'react-icons/fi'
import { useState } from 'react'

const secciones = [
  {
    id: 'inicio',
    titulo: 'Panel Principal (Inicio)',
    icono: <FiHome size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'El panel principal te muestra un resumen rapido de todo lo que esta pasando con los alquileres.' },
      { tipo: 'paso', valor: 'Cuando entras al sistema, lo primero que ves es el Inicio con los numeros importantes del dia.' },
      { tipo: 'lista', valor: [
        'Alquileres Activos: Cuantas personas tienen ropa alquilada ahora mismo.',
        'Devueltos: Cuantos ya devolvieron su ropa.',
        'Vencidos: Cuantos NO devolvieron y ya paso la fecha. Aparece en ROJO para que lo veas rapido.',
        'Ingresos: Cuanto dinero entro hoy.',
      ]},
      { tipo: 'alerta', valor: 'Si hay alquileres vencidos, veras una alerta ROJA grande arriba. Haz clic en "Ver ahora" para ir directo a esos registros.' },
      { tipo: 'texto', valor: 'Tambien puedes ver la barra de progreso que muestra que porcentaje de clientes ya devolvio.' },
    ],
  },
  {
    id: 'registrar',
    titulo: 'Como Registrar un Alquiler',
    icono: <FiUserPlus size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'Para registrar un nuevo alquiler, ve a la seccion "Registro" en el menu lateral.' },
      { tipo: 'subtitulo', valor: 'Alquiler Individual (1 persona)' },
      { tipo: 'pasos', valor: [
        'Haz clic en "Individual" arriba del formulario.',
        'Llena el nombre del cliente, celular y CI.',
        'Selecciona la danza (ej: Chacarera, Morenada, etc.).',
        'Agrega las prendas que se lleva: nombre de la prenda y cantidad.',
        'Si lleva mas de una prenda, haz clic en "+ Otra prenda".',
        'Escribe el precio total en Bs.',
        'Selecciona el metodo de pago (Efectivo o QR).',
        'Selecciona el tipo de garantia (CI + Efectivo, CI + QR, etc.).',
        'Escribe la fecha de devolucion.',
        'Haz clic en "Guardar Alquiler".',
      ]},
      { tipo: 'subtitulo', valor: 'Alquiler Grupal (varios integrantes)' },
      { tipo: 'pasos', valor: [
        'Haz clic en "Grupal" arriba del formulario.',
        'Puedes crear un grupo NUEVO o agregar integrantes a un grupo que ya existe.',
        'Para un grupo nuevo: escribe el nombre del responsable, grupo, danza, etc.',
        'Agrega cada integrante con su nombre, prendas, monto y garantia.',
        'Haz clic en "Guardar Alquiler".',
        'Si faltan integrantes (llegan despues), puedes agregarlos desde la lista de Alquileres.',
      ]},
      { tipo: 'importante', valor: 'Los integrantes ya guardados NO se pueden editar. Si necesitas cambiar algo, envia una solicitud de edicion al administrador.' },
    ],
  },
  {
    id: 'devoluciones',
    titulo: 'Como Registrar Devoluciones',
    icono: <FiRefreshCw size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'Cuando un cliente devuelve su ropa, debes marcar su alquiler como "Devuelto".' },
      { tipo: 'subtitulo', valor: 'Devolucion Individual' },
      { tipo: 'pasos', valor: [
        'Ve a "Alquileres" en el menu.',
        'Busca al cliente por nombre usando la lupa.',
        'Haz clic en la fila del cliente para abrir el detalle.',
        'Veras un boton grande naranja que dice "REGISTRAR DEVOLUCION".',
        'Haz clic en el boton. Te pedira confirmacion.',
        'Confirma y listo. El alquiler cambiara a color naranja (devuelto).',
      ]},
      { tipo: 'subtitulo', valor: 'Devolucion Grupal (por integrante)' },
      { tipo: 'pasos', valor: [
        'Ve a "Alquileres" y abre el grupo.',
        'Veras la lista de integrantes con un cuadrito al lado de cada nombre.',
        'Cuando un integrante devuelve su ropa, haz clic en el cuadrito.',
        'Te pedira confirmacion. Confirma y se marcara verde con tachado.',
        'Puedes ver cuantos devolvieron con la barra de progreso (ej: "5 de 10 devolvieron").',
        'Cuando TODOS los integrantes devolvieron, aparece un boton grande para marcar todo el grupo como devuelto.',
      ]},
      { tipo: 'importante', valor: 'Una vez que marcas a alguien como devuelto, NO se puede deshacer. Si te equivocaste, debes enviar una solicitud al administrador explicando el motivo.' },
    ],
  },
  {
    id: 'colores',
    titulo: 'Que Significan los Colores',
    icono: <FiAlertCircle size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'El sistema usa colores para que puedas saber rapidamente el estado de cada alquiler sin leer cada detalle.' },
      { tipo: 'color', color: 'white', label: 'BLANCO', descripcion: 'El alquiler esta activo y todavia tiene tiempo para devolver. Todo esta bien.' },
      { tipo: 'color', color: 'orange', label: 'NARANJA', descripcion: 'El cliente YA devolvio la ropa correctamente. No hay nada pendiente.' },
      { tipo: 'color', color: 'red', label: 'ROJO', descripcion: 'ATENCION: El cliente NO devolvio la ropa y la fecha ya vencio. Necesitas contactarlo o hacer seguimiento.' },
      { tipo: 'texto', valor: 'Estos colores aparecen automaticamente en la lista de alquileres, en el inicio y en finanzas.' },
    ],
  },
  {
    id: 'buscar',
    titulo: 'Como Buscar Registros',
    icono: <FiSearch size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'Hay varias formas de buscar registros rapidamente.' },
      { tipo: 'pasos', valor: [
        'En "Alquileres", usa la barra de busqueda (lupa) arriba. Puedes buscar por nombre, danza o codigo.',
        'Puedes filtrar por tipo: "Todos", "Individuales" o "Grupales" usando los botones.',
        'En el Inicio, tambien hay una lupa para buscar en los ultimos registros.',
        'Dentro de un grupo con muchos integrantes (mas de 5), aparece una lupa para buscar por nombre del integrante.',
      ]},
    ],
  },
  {
    id: 'solicitudes',
    titulo: 'Solicitudes de Edicion',
    icono: <FiEdit size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'Los trabajadores NO pueden editar o borrar registros directamente. Si necesitas hacer un cambio, debes enviar una solicitud al administrador.' },
      { tipo: 'subtitulo', valor: 'Como enviar una solicitud' },
      { tipo: 'pasos', valor: [
        'Abre el detalle del alquiler que necesitas cambiar.',
        'Haz clic en "Solicitar Edicion" al fondo del detalle.',
        'Escribe el motivo: que quieres cambiar y por que.',
        'Haz clic en "Enviar Solicitud".',
        'El administrador recibira la solicitud y la aprobara o rechazara.',
      ]},
      { tipo: 'subtitulo', valor: 'Solicitar revertir devolucion' },
      { tipo: 'pasos', valor: [
        'Si marcaste a alguien como devuelto por error, haz clic en el cuadrito verde.',
        'Te aparecera un formulario para explicar por que necesitas revertir.',
        'Escribe el motivo y haz clic en "Enviar Solicitud".',
        'Solo el administrador puede revertir una devolucion.',
      ]},
    ],
  },
  {
    id: 'alertas',
    titulo: 'Como Funcionan las Alertas',
    icono: <FiAlertCircle size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'El sistema te avisa automaticamente cuando hay problemas.' },
      { tipo: 'lista', valor: [
        'Alerta ROJA en el Inicio: Hay alquileres vencidos (clientes que no devolvieron a tiempo). Haz clic en "Ver ahora" para ver cuales.',
        'Badge "Vencido" parpadeante: En la lista de alquileres, los vencidos tienen una etiqueta roja que parpadea.',
        'Barra de progreso: Muestra visualmente cuantos devolvieron y cuantos faltan.',
        'Contadores de garantias: En finanzas ves cuantas garantias (QR, Efectivo, CI, Prenda) tienes pendientes de devolver.',
      ]},
    ],
  },
  {
    id: 'grupos',
    titulo: 'Agregar Integrantes a Grupos',
    icono: <FiUsers size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'A veces los integrantes de un grupo no llegan todos juntos. Unos llegan en la manana y otros en la tarde.' },
      { tipo: 'pasos', valor: [
        'Ve a "Alquileres" y busca el grupo.',
        'Haz clic en la fila para abrir el detalle.',
        'Busca el boton "Agregar Integrante" (color guindo/bordo).',
        'Llena: nombre, metodo de pago, monto, garantia, tipo de garantia.',
        'Agrega las prendas que lleva el integrante.',
        'Haz clic en "Guardar Integrante".',
        'El nuevo integrante aparecera en la lista del grupo.',
      ]},
      { tipo: 'importante', valor: 'Solo puedes agregar integrantes mientras el grupo este ACTIVO (no devuelto). Los integrantes ya guardados no se pueden editar.' },
    ],
  },
  {
    id: 'finanzas',
    titulo: 'Seccion de Finanzas',
    icono: <FiDollarSign size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'En finanzas puedes ver todo el dinero que entra y los detalles de cada alquiler.' },
      { tipo: 'lista', valor: [
        'Ingresos de hoy, esta semana y este mes.',
        'Cuantas personas individuales y cuantos grupos hay.',
        'Desglose por metodo de pago: Efectivo vs QR.',
        'Garantias pendientes de devolver por tipo.',
        'Estado de resultados con subtotales.',
        'Desglose por dia con la tabla detallada.',
        'Puedes filtrar por periodo: Hoy, Semana, Mes o Todos.',
      ]},
    ],
  },
  {
    id: 'chat',
    titulo: 'Chat del Equipo',
    icono: <FiMessageSquare size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'El chat sirve para comunicarte con tus companeros de trabajo en tiempo real.' },
      { tipo: 'pasos', valor: [
        'Ve a "Chat" en el menu lateral.',
        'Escribe tu mensaje en el campo de texto abajo.',
        'Haz clic en el boton de enviar o presiona Enter.',
        'Los mensajes se organizan por dia.',
      ]},
    ],
  },
  {
    id: 'confirmacion',
    titulo: 'Ventanas de Confirmacion',
    icono: <FiCheck size={20} />,
    contenido: [
      { tipo: 'texto', valor: 'Para evitar errores accidentales, el sistema te pedira confirmacion antes de hacer acciones importantes.' },
      { tipo: 'lista', valor: [
        'Antes de registrar una devolucion.',
        'Antes de marcar como perdida.',
        'Antes de aprobar o rechazar solicitudes (admin).',
        'Antes de activar o desactivar usuarios (admin).',
        'Antes de revertir una devolucion (admin).',
      ]},
      { tipo: 'texto', valor: 'Siempre veras un mensaje claro preguntando "¿Estas seguro?" con dos botones: "Confirmar" y "Cancelar". Si no estas seguro, haz clic en "Cancelar".' },
    ],
  },
]

export default function ManualPage() {
  const [seccionActiva, setSeccionActiva] = useState('inicio')

  const seccion = secciones.find(s => s.id === seccionActiva)

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FiBook className="text-guindo-700" /> Manual de Instrucciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">Aprende a usar el sistema paso a paso. Haz clic en cada seccion para ver las instrucciones.</p>
        </div>

        {/* Navegacion de secciones */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {secciones.map(s => (
            <button
              key={s.id}
              onClick={() => setSeccionActiva(s.id)}
              className={`p-3 rounded-xl text-left transition-all flex items-center gap-2 text-sm font-medium ${
                seccionActiva === s.id
                  ? 'bg-guindo-700 text-white shadow-lg'
                  : 'bg-white border-2 border-gray-100 text-gray-700 hover:border-guindo-200 hover:bg-guindo-50'
              }`}
            >
              <span className="shrink-0">{s.icono}</span>
              <span className="truncate">{s.titulo}</span>
            </button>
          ))}
        </div>

        {/* Contenido de la seccion */}
        {seccion && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              {seccion.icono} {seccion.titulo}
            </h2>
            <div className="space-y-4">
              {seccion.contenido.map((item, idx) => {
                if (item.tipo === 'texto') {
                  return <p key={idx} className="text-gray-600 text-sm leading-relaxed">{item.valor as string}</p>
                }
                if (item.tipo === 'subtitulo') {
                  return <h3 key={idx} className="text-base font-bold text-gray-800 mt-4 pt-2 border-t border-gray-100">{item.valor as string}</h3>
                }
                if (item.tipo === 'paso') {
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">i</span>
                      <p className="text-sm text-blue-800">{item.valor as string}</p>
                    </div>
                  )
                }
                if (item.tipo === 'lista') {
                  return (
                    <ul key={idx} className="space-y-2">
                      {(item.valor as string[]).map((li, liIdx) => (
                        <li key={liIdx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-guindo-400 mt-1.5 shrink-0" />
                          {li}
                        </li>
                      ))}
                    </ul>
                  )
                }
                if (item.tipo === 'pasos') {
                  return (
                    <div key={idx} className="space-y-2">
                      {(item.valor as string[]).map((paso, pasoIdx) => (
                        <div key={pasoIdx} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                          <span className="w-7 h-7 bg-guindo-700 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {pasoIdx + 1}
                          </span>
                          <p className="text-sm text-gray-700 pt-1">{paso}</p>
                        </div>
                      ))}
                    </div>
                  )
                }
                if (item.tipo === 'alerta') {
                  return (
                    <div key={idx} className="p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                      <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-red-700 font-medium">{item.valor as string}</p>
                    </div>
                  )
                }
                if (item.tipo === 'importante') {
                  return (
                    <div key={idx} className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
                      <FiAlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-yellow-800 font-medium">{item.valor as string}</p>
                    </div>
                  )
                }
                if (item.tipo === 'color') {
                  const colorItem = item as { tipo: string; color: string; label: string; descripcion: string }
                  const bgMap: Record<string, string> = {
                    white: 'bg-white border border-gray-200',
                    orange: 'bg-orange-50 border-2 border-orange-300',
                    red: 'bg-red-50 border-2 border-red-300',
                  }
                  const textMap: Record<string, string> = {
                    white: 'text-gray-800',
                    orange: 'text-orange-800',
                    red: 'text-red-800',
                  }
                  return (
                    <div key={idx} className={`p-4 rounded-xl flex items-center gap-4 ${bgMap[colorItem.color]}`}>
                      <div className={`w-12 h-12 rounded-lg ${bgMap[colorItem.color]} flex items-center justify-center`}>
                        <span className={`text-lg font-black ${textMap[colorItem.color]}`}>{colorItem.label.charAt(0)}</span>
                      </div>
                      <div>
                        <p className={`font-bold ${textMap[colorItem.color]}`}>{colorItem.label}</p>
                        <p className="text-sm text-gray-600">{colorItem.descripcion}</p>
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
