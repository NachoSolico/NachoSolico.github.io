// Resultados de ayer (jornada 1, sábado 07/11/2026), leídos de resultados-ecuestres.es: prueba → [hora de actualización, [puesto, jinete, caballo, total]]
const RES_J1_RAW = {};   // en esta versión los resultados llegan en directo
// Campeonato de Castilla-La Mancha: cada categoría suma una prueba de ayer y otra de hoy, con el mismo peso (criterio del campeonato de 2024)
const CAMPEONATOS = [
 {nombre:"4 años", d1:"PRELIMINAR 4 AÑOS", d2:"FINAL 4 AÑOS", os:"FINAL 4 AÑOS (CAMPEONATO)"},
 {nombre:"5 años", d1:"PRELIMINAR 5 AÑOS", d2:"FINAL 5 AÑOS", os:"FINAL 5 AÑOS (CAMPEONATO)"},
 {nombre:"Asiento y Posición", d1:"ASIENTO Y POSICIÓN PRELIMINAR", d2:"ASIENTO Y POSICIÓN FINAL", os:"ASIENTO Y POSICION FINAL (CAMPEONATO)"},
 {nombre:"Rider 1", d1:"RIDER 1A", d2:"RIDER 1C", os:"RIDER 1C (CAMPEONATO)"},
 {nombre:"Alevines", d1:"ALEVINES EQUIPOS", d2:"ALEVINES INDIVIDUAL", os:"ALEVINES INDIVIDUAL (CAMPEONATO)"},
 {nombre:"Rider 2", d1:"RIDER 2A", d2:"RIDER 2B", os:"RIDER 2B (CAMPEONATO)"},
 {nombre:"Infantiles", d1:"INFANTILES EQUIPOS", d2:"INFANTILES INDIVIDUAL", os:"INFANTILES INDIVIDUAL (CAMPEONATO)"},
 {nombre:"Juveniles 0*", d1:"JUVENILES 0* EQUIPOS", d2:"JUVENILES 0* INDIVIDUAL", os:"JUVENILES 0* INDIVIDUAL (CAMPEONATO)"},
 {nombre:"Juveniles", d1:"JUVENILES EQUIPOS", d2:"JUVENILES INDIVIDUAL", os:"JUVENILES INDIVIDUAL (CAMPEONATO)"},
 {nombre:"Rider 3", d1:"RIDER 3A", d2:"RIDER 3B", os:"RIDER 3B (CAMPEONATO)"},
 {nombre:"Clásicas", d1:"CLÁSICA 1", d2:"CLÁSICA 2", os:"CLÁSICA 2 (CAMPEONATO)"},
 {nombre:"San Jorge e Intermedia I", d1:"SAN JORGE", d2:"INTERMEDIA I", os:"INTERMEDIA I (CAMPEONATO)"}
];


const EVENTO_HOY = {
  nombre:"Campeonato de Doma Clásica de Castilla-La Mancha · Final Riders",
  corto:"Doma Clásica CLM",
  fecha:"2026-11-08", fechaTxt:"domingo 8 de noviembre de 2026",
  web:"https://resultados-ecuestres.es/?c=Prueba&a=MostrarPrueba&id=16"
};
// Resultados en directo de cada prueba (resultados-ecuestres.es, concurso 16, jornada 2). En esa web, «(CDT)» es la prueba que no es de campeonato.
const RES_BASE = "https://resultados-ecuestres.es/?c=Resultado&a=Resultado&id=16&jornada=2&prueba=";
const RES_GENERAL = "https://resultados-ecuestres.es/?c=ResultadoGeneral&a=ResultadoGeneral&id=16&jornada=2";
const RES_WEB = {
  "ALEVINES INDIVIDUAL (CAMPEONATO)":1, "FINAL 5 AÑOS (CAMPEONATO)":2, "FINAL 4 AÑOS (CAMPEONATO)":3, "FINAL 4 AÑOS":14,
  "ASIENTO Y POSICION FINAL (CAMPEONATO)":4, "ASIENTO Y POSICION FINAL":5, "RIDER 1C (CAMPEONATO)":6, "RIDER 1C":7,
  "RIDER 2B (CAMPEONATO)":null, "RIDER 2B":8, "RIDER 3B (CAMPEONATO)":null,
  "INFANTILES INDIVIDUAL (CAMPEONATO)":15, "JUVENILES 0* INDIVIDUAL (CAMPEONATO)":9, "JUVENILES INDIVIDUAL (CAMPEONATO)":10,
  "JUVENILES INDIVIDUAL":11, "CLÁSICA 2 (CAMPEONATO)":12, "INTERMEDIA I (CAMPEONATO)":13
};
// Foto de las clasificaciones provisionales leídas de resultados-ecuestres.es (solo binomios con nota o con estado)
const RES_FOTO = {hora:"", pruebas:[]};
const numRes = t => { const v = parseFloat(String(t||"").replace(",", ".")); return isNaN(v) ? null : v; };
const fmtNum = v => v == null ? "" : v.toFixed(3).replace(".", ",");
function fotoJ1(){
  return Object.entries(RES_J1_RAW).map(([prueba,[act,filas]]) => ({prueba, jornada:1, actualizado:act, foto:true,
    clasificacion: filas.map(([puesto,jinete,caballo,total]) => typeof puesto === "number"
      ? {puesto, jinete, caballo, resultado: fmtNum(numRes(total)) + " %"}
      : {puesto, jinete, caballo, resultado: CODIGOS[puesto] || puesto})}));
}
const jor = p => p.jornada || 2;
function enlaceRes(prueba){
  if (st.subida) return null;
  const k = Object.keys(RES_WEB).find(x => norm(x) === norm(prueba));
  if (k === undefined) return null;
  return RES_WEB[k] ? RES_BASE + RES_WEB[k] : RES_GENERAL;
}
// [pista, prueba, orden, hora, jinete, caballo] — de la orden de salida oficial de la Federación Hípica de Castilla-La Mancha
const SALIDAS_HOY = [["Huécar","RIDER 1C",1,"09:00","Gema Cuenca Sánchez","JOYA LXXXVIII"],
["Huécar","RIDER 1C",2,"09:07","Nerea Jiménez Castillo","HECHICERO MAR II"],
["Huécar","RIDER 1C",3,"09:14","Gabriela Moreno Navarro","MACARENO LXXII"],
["Huécar","RIDER 1C (CAMPEONATO)",1,"09:21","Diana Álvarez Mejía","TIZON"],
["Huécar","RIDER 1C (CAMPEONATO)",2,"09:28","Ainoha Sánchez Serrano","INDY"],
["Huécar","RIDER 1C (CAMPEONATO)",3,"09:35","Gabriela López Bellido","GENERAL"],
["Huécar","RIDER 1C (CAMPEONATO)",4,"09:42","Samara Echevarría Fernández","CAPRICHOSO RF"],
["Huécar","RIDER 1C (CAMPEONATO)",5,"09:49","Jimena Labrado Sánchez","AGENTE PG"],
["Huécar","RIDER 1C (CAMPEONATO)",6,"09:56","Sofía Jiménez Zapata","SOLITARIO TORRELUNA"],
["Huécar","RIDER 1C (CAMPEONATO)",7,"10:03","Valeria Timón Fernández","MACARENA"],
["Huécar","RIDER 1C (CAMPEONATO)",8,"10:10","Candela Dontchev Camacho","LATINO FS"],
["Huécar","RIDER 1C (CAMPEONATO)",9,"10:17","Sofia Echevarría Ramírez","POCHOLO XVII"],
["Huécar","RIDER 1C (CAMPEONATO)",10,"10:24","Itzíar Escobar Rico","OCTOPUS NG"],
["Huécar","RIDER 1C (CAMPEONATO)",11,"10:31","María Doctor Martín","ABEL"],
["Huécar","RIDER 1C (CAMPEONATO)",12,"10:38","Sara Sabir Elguouhi","RUBIO"],
["Huécar","RIDER 1C (CAMPEONATO)",13,"10:45","Ainara Juzgado García","ELEGANTE DCR"],
["Huécar","RIDER 1C (CAMPEONATO)",14,"10:52","Julieta De Rosario Herreros Tamayo","YUPPI"],
["Huécar","RIDER 1C (CAMPEONATO)",15,"10:59","Alicia Pelka","TABACHIN 1"],
["Huécar","RIDER 1C (CAMPEONATO)",16,"11:06","Valeria Cuenca Díaz","ZUMBIDO"],
["Huécar","RIDER 1C (CAMPEONATO)",17,"11:13","Cristina Márquez Toribio","PIROPO LXXVII"],
["Huécar","RIDER 1C (CAMPEONATO)",18,"11:20","Saray Giorgiana Cristea","CARAMELO"],
["Huécar","RIDER 2B (CAMPEONATO)",1,"12:00","Claudia Brasero Rubio","GARBO VII"],
["Huécar","RIDER 2B (CAMPEONATO)",2,"12:07","Triana Abad Aranda","ALBERO TRI"],
["Huécar","RIDER 2B (CAMPEONATO)",3,"12:14","Lucia González Soria","YUKON"],
["Huécar","RIDER 2B (CAMPEONATO)",4,"12:21","Daniela Moro Kluskova","NH MIKY"],
["Huécar","RIDER 2B (CAMPEONATO)",5,"12:28","Nayla Vacas Blanes","SABIONDO V"],
["Huécar","RIDER 2B (CAMPEONATO)",6,"12:35","Marina Collado Clemente","GITANA"],
["Huécar","RIDER 2B (CAMPEONATO)",7,"12:42","Sofia Rodríguez Gómez","GLORIOSO FR"],
["Huécar","RIDER 2B (CAMPEONATO)",8,"12:49","Shaila Gamboa Rubio","GALAN"],
["Huécar","RIDER 2B (CAMPEONATO)",9,"12:56","Amalia Hernández Moreno","DIVINO LXIII"],
["Huécar","RIDER 2B (CAMPEONATO)",10,"13:03","Abril Jurado Romero","DUQUESA"],
["Huécar","RIDER 2B (CAMPEONATO)",11,"13:10","Clara León Fernández","CHALAN"],
["Huécar","RIDER 2B (CAMPEONATO)",12,"13:17","Sofia Peña Rodríguez","POCHOLO XVII"],
["Huécar","RIDER 2B (CAMPEONATO)",13,"13:24","Alicia Toro Puerta","DAMASCO XXII"],
["Huécar","RIDER 2B (CAMPEONATO)",14,"13:31","Valeria Cava Sabio","SILVANA"],
["Huécar","RIDER 2B (CAMPEONATO)",15,"13:38","Carlota de La Fuente García","RONDEÑO"],
["Huécar","RIDER 2B (CAMPEONATO)",16,"13:45","Triana Abad Aranda","GACEL 25%"],
["Huécar","RIDER 2B (CAMPEONATO)",17,"13:52","Enrique Cañas Lara","GIRASOL IV JR 50%"],
["Huécar","RIDER 2B (CAMPEONATO)",18,"13:59","Marina Saiz Gil","PIREN"],
["Huécar","RIDER 2B (CAMPEONATO)",19,"14:06","Joaquín Canales Ocaña","DIVINO LXIII"],
["Huécar","RIDER 3B (CAMPEONATO)",1,"14:50","Leyre Jiménez Casero","MORA V"],
["Huécar","RIDER 3B (CAMPEONATO)",2,"14:57","Valeria Álvarez Mejía","SIDNEY"],
["Huécar","RIDER 3B (CAMPEONATO)",3,"15:04","Paula de Miguel Martín","ALFARERO XXXIV"],
["Huécar","RIDER 3B (CAMPEONATO)",4,"15:11","Lucía Galán Ballesteros","BIBIANO"],
["Huécar","RIDER 3B (CAMPEONATO)",5,"15:18","Paula Bautista Ramírez","ODIEL N"],
["Huécar","RIDER 3B (CAMPEONATO)",6,"15:25","Ramón Martínez Herrero","ATICO DE POZAS"],
["Huécar","RIDER 2B",1,"15:35","Daniel Pascual Barros","GANADOR XCII"],
["Huécar","RIDER 2B",2,"15:42","Marta Megía León","SOLITARIO XXVI"],
["Huécar","RIDER 2B",3,"15:49","Marina Vacas Blanes","SABIONDO V"],
["Huécar","RIDER 2B",4,"15:56","Ella Soto Sánchez","SILVANA D&M"],
["Júcar","FINAL 4 AÑOS (CAMPEONATO)",1,"09:00","Daniel Sedeño Navas","YEMCA"],
["Júcar","FINAL 4 AÑOS (CAMPEONATO)",2,"09:07","Noemi Díaz Sánchez","GINEBRA"],
["Júcar","FINAL 4 AÑOS (CAMPEONATO)",3,"09:14","Guillermo Geis Cobo","BENJAMIN VII"],
["Júcar","FINAL 4 AÑOS",1,"09:28","Marta Urosa Fernández","ALTAIR MAT"],
["Júcar","FINAL 4 AÑOS",2,"09:35","Ana Martínez López","BANDERA"],
["Júcar","FINAL 4 AÑOS",3,"09:42","David de Castro Gómez-Serranillos","SPECIAL VEUX"],
["Júcar","FINAL 5 AÑOS (CAMPEONATO)",1,"09:49","David Manzanero Rubio","ROBALO DE LA GESSE"],
["Júcar","FINAL 5 AÑOS (CAMPEONATO)",2,"09:56","Guillermo Carrizo Viso","DONNA DE GOSS"],
["Júcar","FINAL 5 AÑOS (CAMPEONATO)",3,"10:03","Julia Fernández Ortega","ESCULTOR BD"],
["Júcar","FINAL 5 AÑOS (CAMPEONATO)",4,"10:10","Daniel Medina Gutiérrez","BIZARRO DE SANZ"],
["Júcar","FINAL 4 AÑOS (CAMPEONATO)",4,"10:17","Daniel Sedeño Navas","PERDIGON (NORDES)"],
["Júcar","ASIENTO Y POSICION FINAL (CAMPEONATO)",1,"10:37","Jorge Arroyo García","EMPORIO"],
["Júcar","ASIENTO Y POSICION FINAL (CAMPEONATO)",2,"10:44","Daniela Márquez López","ACERO+ (JESUITA)"],
["Júcar","ASIENTO Y POSICION FINAL (CAMPEONATO)",3,"10:51","Alberto Rodríguez Diaz","QUINO QUIN"],
["Júcar","ASIENTO Y POSICION FINAL (CAMPEONATO)",4,"10:58","Emma Sánchez Vargas","DUQUESA"],
["Júcar","ASIENTO Y POSICION FINAL (CAMPEONATO)",5,"11:05","Anaya Martin Valverde","GUAJE"],
["Júcar","ASIENTO Y POSICION FINAL (CAMPEONATO)",6,"11:12","Carla Bargueño Lozano","LUSTRE III"],
["Júcar","ASIENTO Y POSICION FINAL",1,"11:19","Amara Torres Alonso","TIZON"],
["Júcar","ASIENTO Y POSICION FINAL",2,"11:26","Claudia Jiménez Castillo","HECHICERO MAR II"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",1,"11:45","Amanda Lara Rivera","YUKON"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",2,"11:52","Triana Tarazaga Campos","CHALAN"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",3,"11:59","Daniel Fernández Fernández","ORUJO XV"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",4,"12:06","Mercedes Pérez Mongrell","EROS PR"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",5,"12:13","Jimena Rodríguez Gómez","LOLO"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",6,"12:20","Alejandra Manzano Valiente","CHOLE"],
["Júcar","INFANTILES INDIVIDUAL (CAMPEONATO)",1,"12:30","Claudia Díaz Aires","TARANTO CLXXXIX"],
["Júcar","INFANTILES INDIVIDUAL (CAMPEONATO)",2,"12:37","Lucía Cepeda Sánchez","INCAUTO XII"],
["Júcar","INFANTILES INDIVIDUAL (CAMPEONATO)",3,"12:44","Beltrán Tardón García","LUSTRE III"],
["Júcar","INFANTILES INDIVIDUAL (CAMPEONATO)",4,"12:51","Alma Sánchez González","TICO V"],
["Júcar","ALEVINES INDIVIDUAL (CAMPEONATO)",7,"13:01","Amanda Lara Rivera","MALABARISTA MAT"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",1,"13:11","Jimena Valtierra Ramos","BELTRAN"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",2,"13:18","Daniela Sánchez Jiménez","OBRADORA XV"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",3,"13:25","Eva Sánchez-Horneros Molina","LLUENT IV"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",4,"13:32","Alejandro Villamuelas Maestre","BALUARTE HAB"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",5,"13:39","Sira Palomar Sáez","GIRALDILLO XLIV"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",6,"13:46","Ángela Martín Gómez","MAZAMON"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",7,"13:53","Marta Megía León","SHAKIRA"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",8,"14:00","José Luis Cuenca Sánchez","AMONTILLADO III"],
["Júcar","JUVENILES 0* INDIVIDUAL (CAMPEONATO)",9,"14:07","Ignacio Cabrerizo Moreno","BRANDY"],
["Júcar","JUVENILES INDIVIDUAL (CAMPEONATO)",1,"14:45","Ella Soto Sánchez","TRIUNFADOR MFE"],
["Júcar","JUVENILES INDIVIDUAL (CAMPEONATO)",2,"14:52","Darío Sanabria López","HIGHFIVE"],
["Júcar","JUVENILES INDIVIDUAL (CAMPEONATO)",3,"14:59","Gabriela Moreno Navarro","PUERTAS"],
["Júcar","JUVENILES INDIVIDUAL (CAMPEONATO)",4,"15:06","Alejandra Navarro García","DONATELLA BM"],
["Júcar","JUVENILES INDIVIDUAL",1,"15:13","Valeria Gaynetdinova","ZEUS VAZ"],
["Júcar","CLÁSICA 2 (CAMPEONATO)",1,"15:23","Paula Mazarro San Juan","DIAMANTE"],
["Júcar","CLÁSICA 2 (CAMPEONATO)",2,"15:30","David Manzanero Rubio","DIANGO DE POZAS"],
["Júcar","CLÁSICA 2 (CAMPEONATO)",3,"15:37","Tania García García","FAIRY TAIL"],
["Júcar","INTERMEDIA I (CAMPEONATO)",1,"15:47","Iván Pozas Gómez","ZALAMERO MG III"],
["Júcar","INTERMEDIA I (CAMPEONATO)",2,"15:54","María Vargas Gálvez","COLIBRI"],
["Júcar","INTERMEDIA I (CAMPEONATO)",3,"16:01","Rafael García Gallo","MENTOR DEL CARPIO"],
["Júcar","INTERMEDIA I (CAMPEONATO)",4,"16:30","Ana Martínez López","ORION"]];
