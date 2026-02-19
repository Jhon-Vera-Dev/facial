"use client";

import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { 
  Download, 
  Filter, 
  Search, 
  RefreshCcw, 
  Package, 
  TrendingUp, 
  AlertCircle,
  ChevronDown,
  X,
  Plus,
  User,
  FileSpreadsheet
} from "lucide-react";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import * as XLSX from 'xlsx';
 
 
 
// Tipo para el usuario de la sesión
type SessionUser = {
  id: number;
  nombre: string;
  correo: string;
  exp: number;
};

// Tipo para los productos
type Producto = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  creadoEn: string;
};

const Dashboard = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroVisible, setFiltroVisible] = useState(false);
  
  // Estados para filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [minPrecio, setMinPrecio] = useState("");
  const [maxPrecio, setMaxPrecio] = useState("");
  const [minStock, setMinStock] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Colores vivos para gráficos
  const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC926', '#1982C4'];

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const decoded = jwtDecode<SessionUser>(token);
      setUser(decoded);
      // Cargar productos
      fetchProductos();
    } catch (err) {
      console.error("Token inválido:", err);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, []);

  const fetchProductos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir URL con filtros
      let url = "/api/productos?";
     if (categoriaFiltro) url += `categoria=${encodeURIComponent(categoriaFiltro)}&`;
if (minPrecio) url += `minPrecio=${encodeURIComponent(minPrecio)}&`;
if (maxPrecio) url += `maxPrecio=${encodeURIComponent(maxPrecio)}&`;
if (minStock) url += `minStock=${encodeURIComponent(minStock)}&`;

      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProductos(data.data);
      } else {
        setError(data.error || "Error al cargar los productos");
      }
    } catch (error) {
      setError("Error de conexión al servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const aplicarFiltros = () => {
    fetchProductos();
    setFiltroVisible(false);
  };

  const limpiarFiltros = () => {
    setCategoriaFiltro("");
    setMinPrecio("");
    setMaxPrecio("");
    setMinStock("");
    setBusqueda("");
    fetchProductos();
  };

  // Función para exportar a Excel
  const exportarExcel = () => {
    // Filtrar productos si hay búsqueda
    const productosFiltrados = productos.filter(p => 
      !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
      p.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );
    
    const worksheet = XLSX.utils.json_to_sheet(productosFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    
    // Guardar archivo
    XLSX.writeFile(workbook, "Inventario_Productos.xlsx");
  };
  
  //creame acá una funcion trayendo a las emocion para luego hacer un select y el filtrado, 

  //consume mi endpoint y luego crea un select, y tambien crea una tabla para que se vean a las personas y poner el estado de animo 

  
  
  // Datos para los gráficos

  
  const getCategoriaData = () => {
    const categorias: {[key: string]: number} = {};
    productos.forEach(p => {
      categorias[p.categoria] = (categorias[p.categoria] || 0) + 1;
    });
    
    return Object.keys(categorias).map(cat => ({
      name: cat,
      value: categorias[cat]
    }));
  };
  
  const getStockData = () => {
    const stockPorCategoria: {[key: string]: number} = {};
    productos.forEach(p => {
      stockPorCategoria[p.categoria] = (stockPorCategoria[p.categoria] || 0) + p.stock;
    });
    
    return Object.keys(stockPorCategoria).map(cat => ({
      categoria: cat,
      stock: stockPorCategoria[cat]
    }));
  };
  
  const getValorInventarioData = () => {
    const valorPorCategoria: {[key: string]: number} = {};
    productos.forEach(p => {
      valorPorCategoria[p.categoria] = (valorPorCategoria[p.categoria] || 0) + (p.precio * p.stock);
    });
    
    return Object.keys(valorPorCategoria).map(cat => ({
      categoria: cat,
      valor: valorPorCategoria[cat]
    }));
  };
  
  // Filtrar productos para la tabla
  const productosFiltrados = productos.filter(p => 
    !busqueda || 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const resumenGeneral = {
    totalProductos: productos.length,
    valorTotal: productos.reduce((sum, p) => sum + (p.precio * p.stock), 0),
    categorias: new Set(productos.map(p => p.categoria)).size,
    stockBajo: productos.filter(p => p.stock < 10).length
  };

  if (!user) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="animate-pulse text-lg">Cargando sesión...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white p-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard de Estados de Ánimo</h1>
              <p className="text-blue-100">Bienvenido, {user.nombre}</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* Menú desplegable */}
            
              <button
                 onClick={() => fetchProductos()} 
                className="flex items-center bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                <RefreshCcw size={18} className="mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>
        </div>

      {/*Estado de animo */}


       
      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6">
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Total Productos</p>
                <h3 className="text-2xl font-bold mt-1">{resumenGeneral.totalProductos}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Package size={24} className="text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Valor Total Inventario</p>
                <h3 className="text-2xl font-bold mt-1">${resumenGeneral.valorTotal.toLocaleString()}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp size={24} className="text-green-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Categorías</p>
                <h3 className="text-2xl font-bold mt-1">{resumenGeneral.categorias}</h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Filter size={24} className="text-yellow-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Productos Stock Bajo</p>
                <h3 className="text-2xl font-bold mt-1">{resumenGeneral.stockBajo}</h3>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle size={24} className="text-red-500" />
              </div>
            </div>
          </div>
        </div>
        
        
        {/* Barra de búsqueda y filtros */}
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setFiltroVisible(!filtroVisible)}
                className="flex items-center bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Filter size={18} className="mr-2" />
                Filtros
                <ChevronDown size={16} className="ml-2" />
              </button>
              
              <button
                onClick={limpiarFiltros}
                className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X size={18} className="mr-2" />
                Limpiar
              </button>
            </div>
          </div>
          
          {/* Panel de filtros */}
          {filtroVisible && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mínimo</label>
                  <input
                    type="number"
                    value={minPrecio}
                    onChange={(e) => setMinPrecio(e.target.value)}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Máximo</label>
                  <input
                    type="number"
                    value={maxPrecio}
                    onChange={(e) => setMaxPrecio(e.target.value)}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={aplicarFiltros}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Tabla de productos */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <h3 className="text-lg font-semibold p-6 border-b">Listado de Productos</h3>
          
          {error && (
            <Alert variant="destructive" className="m-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Cargando productos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productosFiltrados.length > 0 ? (
                    productosFiltrados.map((producto) => (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producto.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{producto.nombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {producto.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${producto.precio.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            producto.stock < 10 
                              ? 'bg-red-100 text-red-800' 
                              : producto.stock < 30 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {producto.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(producto.precio * producto.stock).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No se encontraron productos con los filtros aplicados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Paginación o información de registros mostrados */}
          <div className="px-6 py-3 flex items-center justify-between border-t">
            <div className="text-sm text-gray-500">
              Mostrando <span className="font-medium">{productosFiltrados.length}</span> de <span className="font-medium">{productos.length}</span> productos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;