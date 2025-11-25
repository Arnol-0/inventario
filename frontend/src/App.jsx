import React, { useState, useMemo, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db, firebaseConfig } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Coffee, ShoppingCart, Package, LogOut, User, Lock, X, Settings } from 'lucide-react';

const CafeteriaSystem = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  

  const [users, setUsers] = useState({});
  useEffect(() => {
    if (!currentUser) return;
    const loadUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const obj = {};
      snap.forEach(d => { obj[d.id] = d.data(); });
      setUsers(obj);
    };
    loadUsers();
  }, [currentUser]);
  const saveUsers = (next) => { setUsers(next); try { localStorage.setItem('usersCache', JSON.stringify(next)); } catch {} };

  // Estado para el panel de vendedor
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const saveProducts = async (next) => {
    setProducts(next);
    try {
      const currentIds = new Set(products.map(p => String(p.id)));
      const nextIds = new Set(next.map(p => String(p.id)));
      for (const id of currentIds) {
        if (!nextIds.has(id)) {
          await deleteDoc(doc(db, 'products', id));
        }
      }
      for (const item of next) {
        await setDoc(doc(db, 'products', String(item.id)), item);
      }
    } catch {}
  };
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        const base = [
          { id: 1, name: 'Café Americano', price: 2500, stock: 50, cafeteria: 'Cafetería Norte' },
          { id: 2, name: 'Café Latte', price: 3000, stock: 40, cafeteria: 'Cafetería Norte' },
          { id: 3, name: 'Capuchino', price: 3200, stock: 35, cafeteria: 'Cafetería Central' },
          { id: 4, name: 'Croissant', price: 2000, stock: 20, cafeteria: 'Cafetería Central' },
          { id: 5, name: 'Sandwich', price: 4500, stock: 15, cafeteria: 'Cafetería Norte' },
          { id: 6, name: 'Torta', price: 3500, stock: 10, cafeteria: 'Cafetería Norte' }
        ];
        setProducts(base);
        try {
          for (const item of base) {
            await setDoc(doc(db, 'products', String(item.id)), item);
          }
        } catch {}
      } else {
        const arr = [];
        snap.forEach(d => { arr.push(d.data()); });
        setProducts(arr);
      }
    };
    load();
  }, [currentUser]);
  const [selection, setSelection] = useState({});
  const incSelection = (id) => {
    setSelection(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };
  const decSelection = (id) => {
    setSelection(prev => {
      const q = (prev[id] || 0) - 1;
      const next = { ...prev };
      if (q <= 0) delete next[id]; else next[id] = q;
      return next;
    });
  };

  // Estado para el panel de inventario
  const [inventory, setInventory] = useState([]);
  const saveInventory = async (next) => {
    setInventory(next);
    try {
      const currentIds = new Set(inventory.map(i => String(i.id)));
      const nextIds = new Set(next.map(i => String(i.id)));
      for (const id of currentIds) {
        if (!nextIds.has(id)) {
          await deleteDoc(doc(db, 'inventory', id));
        }
      }
      for (const item of next) {
        await setDoc(doc(db, 'inventory', String(item.id)), item);
      }
    } catch {}
  };
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      const snap = await getDocs(collection(db, 'inventory'));
      if (snap.empty) {
        const baseInv = [
          { id: 1, item: 'Café en grano', quantity: 500, unit: 'kg', minStock: 50, cafeteria: 'Cafetería Norte' },
          { id: 2, item: 'Leche', quantity: 200, unit: 'L', minStock: 30, cafeteria: 'Cafetería Norte' },
          { id: 3, item: 'Azúcar', quantity: 150, unit: 'kg', minStock: 20, cafeteria: 'Cafetería Central' },
          { id: 4, item: 'Vasos desechables', quantity: 1000, unit: 'unidades', minStock: 200, cafeteria: 'Cafetería Central' },
          { id: 5, item: 'Servilletas', quantity: 2000, unit: 'unidades', minStock: 500, cafeteria: 'Cafetería Norte' }
        ];
        setInventory(baseInv);
        try {
          for (const item of baseInv) {
            await setDoc(doc(db, 'inventory', String(item.id)), item);
          }
        } catch {}
      } else {
        const arr = [];
        snap.forEach(d => { arr.push(d.data()); });
        setInventory(arr);
      }
    };
    load();
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const ident = (loginData.email || '').trim().toLowerCase();
    const pass = loginData.password || '';
    if (!auth) {
      setError('Configura Firebase en .env');
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, ident, pass);
      let meta = null;
      try {
        const q = query(collection(db, 'users'), where('email', '==', ident));
        const qs = await getDocs(q);
        meta = qs.docs[0]?.data() || null;
      } catch {}
      if (!meta) {
        const localStateMeta = Object.values(users).find(u => (u.email||'').toLowerCase() === ident) || null;
        const localCache = (() => { try { return JSON.parse(localStorage.getItem('usersCache')||'{}'); } catch { return {}; } })();
        const localMeta = localStateMeta || Object.values(localCache).find(u => (u.email||'').toLowerCase() === ident) || null;
        if (localMeta) {
          meta = localMeta;
        } else if (ident === 'admin@cafeteria.cl') {
          const bootstrap = { username: 'admin', email: ident, role: 'admin', cafeteria: 'Cafetería Central' };
          await setDoc(doc(db, 'users', 'admin'), bootstrap);
          meta = bootstrap;
          saveUsers({ ...users, admin: bootstrap });
        } else {
          setError('Usuario no registrado en el sistema');
          await signOut(auth);
          return;
        }
      }
      setCurrentUser(meta);
      setError('');
      setLoginData({ email: '', password: '' });
      if (meta.role === 'vendedor') {
        const key = `shiftStart:${meta.username}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, String(Date.now()));
        }
      }
    } catch (err) {
      setError('Correo o contraseña incorrectos');
    }
  };

  const createAdmin = async () => {
    const ident = (loginData.email || '').trim().toLowerCase();
    const pass = loginData.password || '';
    if (!auth || !db) {
      setError('Configura Firebase en .env');
      return;
    }
    if (!ident || !pass) {
      setError('Ingresa correo y contraseña');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, ident, pass);
    } catch (err) {
      try {
        await signInWithEmailAndPassword(auth, ident, pass);
      } catch {
        setError('No se pudo crear el admin');
        return;
      }
    }
    const meta = { username: 'admin', email: ident, role: 'admin', cafeteria: 'Cafetería Central' };
    try { await setDoc(doc(db, 'users', 'admin'), meta); } catch {}
    saveUsers({ ...users, admin: meta });
    setCurrentUser(meta);
    setError('');
    setLoginData({ email: '', password: '' });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCart([]);
    setError('');
    setIsCartOpen(false);
    setIsReceiptOpen(false);
    setIsSettingsOpen(false);
    setIsMenuOpen(false);
    setIsCloseShiftOpen(false);
  };

  const addToCart = (product) => {
    const qty = selection[product.id] || 1;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, { ...product, quantity: qty }];
    });
    setSelection(prev => { const next = { ...prev }; delete next[product.id]; return next; });
    setIsCartOpen(true);
  };

  const incrementCart = (id) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item));
  };

  const decrementCart = (id) => {
    setCart(prev => prev.reduce((acc, item) => {
      if (item.id === id) {
        const q = item.quantity - 1;
        if (q > 0) acc.push({ ...item, quantity: q });
      } else {
        acc.push(item);
      }
      return acc;
    }, []));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('ventas');
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'vendedor', cafeteria: '' });
  const [userError, setUserError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '' });
  const [isAdminInvModalOpen, setIsAdminInvModalOpen] = useState(false);
  const [adminNewInv, setAdminNewInv] = useState({ item: '', quantity: '', unit: '', minStock: '', cafeteria: '' });
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [closeShiftForm, setCloseShiftForm] = useState({ cash: '', card: '' });
  const [adminStoreFilter, setAdminStoreFilter] = useState('');
  const [statsStoreFilter, setStatsStoreFilter] = useState('');
  const [mgrTab, setMgrTab] = useState('inventario');
  const [isMgrProductModalOpen, setIsMgrProductModalOpen] = useState(false);
  const [mgrNewProduct, setMgrNewProduct] = useState({ name: '', price: '', stock: '' });
  const [isMgrInvModalOpen, setIsMgrInvModalOpen] = useState(false);
  const [mgrNewInv, setMgrNewInv] = useState({ item: '', quantity: '', unit: '', minStock: '' });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('storeSettings');
    const base = saved ? JSON.parse(saved) : { storeName: 'Cafetería', taxRate: 0.19 };
    return { pricesIncludeTax: false, ...base };
  });
  const saveSettings = (next) => {
    setSettings(next);
    localStorage.setItem('storeSettings', JSON.stringify(next));
  };
  const [sales, setSales] = useState([]);
  const saveSales = async (next) => {
    setSales(next);
    try {
      const currentIds = new Set(sales.map(s => String(s.id)));
      const nextIds = new Set(next.map(s => String(s.id)));
      for (const id of currentIds) {
        if (!nextIds.has(id)) {
          await deleteDoc(doc(db, 'sales', id));
        }
      }
      for (const item of next) {
        await setDoc(doc(db, 'sales', String(item.id)), item);
      }
    } catch {}
  };
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      const snap = await getDocs(collection(db, 'sales'));
      const arr = [];
      snap.forEach(d => { arr.push(d.data()); });
      setSales(arr);
    };
    load();
  }, [currentUser]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);
  const computedTotals = useMemo(() => {
    const gross = cartSubtotal;
    let subtotal = gross;
    let tax = 0;
    let total = gross;
    if (settings.pricesIncludeTax) {
      tax = Math.round(total * settings.taxRate / (1 + settings.taxRate));
      subtotal = total - tax;
    } else {
      tax = Math.round(subtotal * settings.taxRate);
      total = subtotal + tax;
    }
    return { subtotal, tax, total };
  }, [cartSubtotal, settings]);

  const completeSale = () => {
    const subtotal = computedTotals.subtotal;
    const tax = computedTotals.tax;
    const total = computedTotals.total;
    const now = Date.now();
      const sale = {
        id: now,
        ts: now,
        date: new Date(now).toLocaleString(),
        seller: currentUser.username,
        cafeteria: currentUser.cafeteria || '',
        items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
        subtotal,
        tax,
        taxRate: settings.taxRate,
        total,
        paymentMethod
      };
    setIsCartOpen(false);
    setReceipt(sale);
    setIsReceiptOpen(true);
    setCart([]);
    saveSales([sale, ...sales]);
    setPaymentMethod('efectivo');
  };

  const updateInventory = (id, newQuantity) => {
    const next = inventory.map(item =>
      item.id === id ? { ...item, quantity: parseInt(newQuantity) || 0 } : item
    );
    saveInventory(next);
  };

  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const [query, setQuery] = useState('');
  const userStore = currentUser?.cafeteria || '';
  const queryLower = (query || '').toLowerCase();
  const productsForStore = useMemo(() => products.filter(p => p.cafeteria === userStore), [products, userStore]);
  const inventoryForStore = useMemo(() => inventory.filter(i => i.cafeteria === userStore), [inventory, userStore]);

  const [invQuery, setInvQuery] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('todos');
  const [invSort, setInvSort] = useState('none');
  const invFiltered = useMemo(() => {
    const q = (invQuery || '').toLowerCase();
    let list = inventory.slice();
    if (q) list = list.filter(i => (i.item || '').toLowerCase().includes(q));
    if (invStatusFilter === 'bajo') list = list.filter(i => (i.quantity || 0) <= (i.minStock || 0));
    if (invStatusFilter === 'ok') list = list.filter(i => (i.quantity || 0) > (i.minStock || 0));
    if (invSort === 'asc') list = list.slice().sort((a,b) => (a.quantity||0) - (b.quantity||0));
    if (invSort === 'desc') list = list.slice().sort((a,b) => (b.quantity||0) - (a.quantity||0));
    return list;
  }, [inventory, invQuery, invStatusFilter, invSort]);

  // Pantalla de Login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Coffee className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Cafetería Sistema</h1>
            <p className="text-gray-600 mt-2">Ingresa tus credenciales</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Correo
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ingresa tu correo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Contraseña
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ingresa tu contraseña"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-3"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={createAdmin}
              className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-gray-100 text-gray-800 hover:bg-gray-200 w-full py-3"
            >
              Crear usuario admin
            </button>
          </form>

          
        </div>
        
      </div>
    );
  }

  // Panel de Encargado de tienda
  if (currentUser.role === 'encargado') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-amber-600 text-white p-4 shadow-lg">
          <div className="container mx-auto max-w-7xl px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Encargado de Tienda</h1>
                <p className="text-sm text-amber-100">Usuario: {currentUser.username} • Cafetería: {currentUser.cafeteria || '—'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-700 hover:bg-amber-800 text-white gap-2 px-4 py-2">
              <LogOut className="w-5 h-5" />
              Salir
            </button>
          </div>
        </header>

        <div className="container mx-auto max-w-7xl px-6 p-6">
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100">
            <div className="p-4 border-b flex gap-2">
              <button onClick={() => setMgrTab('inventario')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${mgrTab==='inventario'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Inventario</button>
              <button onClick={() => setMgrTab('productos')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${mgrTab==='productos'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Productos de venta</button>
              <button onClick={() => setMgrTab('ventas')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${mgrTab==='ventas'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Ventas del día</button>
              <button onClick={() => setMgrTab('estadisticas')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${mgrTab==='estadisticas'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Estadísticas</button>
            </div>
            <div className="p-6">
              {mgrTab === 'inventario' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Inventario de {currentUser.cafeteria}</h2>
                  <div className="mb-4 flex justify-end">
                    <button onClick={() => setIsMgrInvModalOpen(true)} className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm">Nuevo ítem</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Artículo</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cantidad</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unidad</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stock Mínimo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryForStore.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="px-6 py-3 font-medium text-gray-800">{item.item}</td>
                            <td className="px-6 py-3 text-gray-800">{item.quantity}</td>
                            <td className="px-6 py-3 text-gray-600">{item.unit}</td>
                            <td className="px-6 py-3 text-gray-600">{item.minStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {mgrTab === 'productos' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Productos de venta de {currentUser.cafeteria}</h2>
                  <div className="mb-4 flex justify-end">
                    <button onClick={() => setIsMgrProductModalOpen(true)} className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm">Nuevo producto</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Precio</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsForStore.map(p => (
                          <tr key={p.id} className="border-b">
                            <td className="px-6 py-3 text-gray-800">{p.name}</td>
                            <td className="px-6 py-3 text-gray-800">${p.price.toLocaleString()}</td>
                            <td className="px-6 py-3 text-gray-800">{p.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {mgrTab === 'ventas' && (
                (() => {
                  const start = new Date(); start.setHours(0,0,0,0);
                  const startMs = start.getTime();
                  const mine = sales.filter(s => s.cafeteria === (currentUser.cafeteria||'') && (s.ts||0) >= startMs);
                  const total = mine.reduce((acc, s) => acc + (s.total||0), 0);
                  return (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Ventas de hoy</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-xl p-4"><p className="text-sm text-gray-600">Ventas</p><p className="text-2xl font-bold text-gray-800">{mine.length}</p></div>
                        <div className="bg-gray-50 rounded-xl p-4"><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-amber-600">${total.toLocaleString()}</p></div>
                        <div className="bg-gray-50 rounded-xl p-4"><p className="text-sm text-gray-600">Cafetería</p><p className="text-2xl font-bold text-gray-800">{currentUser.cafeteria}</p></div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Vendedor</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mine.map(s => (
                              <tr key={s.id} className="border-b">
                                <td className="px-6 py-3 text-gray-800">{s.date}</td>
                                <td className="px-6 py-3 text-gray-800">{s.seller}</td>
                                <td className="px-6 py-3 text-gray-800">{s.items.length}</td>
                                <td className="px-6 py-3 font-semibold text-amber-600">${s.total.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
              {mgrTab === 'estadisticas' && (
                (() => {
                  const base = sales.filter(s => s.cafeteria === (currentUser.cafeteria||''));
                  const group = {};
                  for (const s of base) {
                    const ms = s.ts ?? s.id ?? Date.parse(s.date);
                    const d = new Date(ms);
                    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                    if (!group[key]) group[key] = { count: 0, subtotal: 0, tax: 0, total: 0, d };
                    group[key].count += 1; group[key].subtotal += s.subtotal||0; group[key].tax += s.tax||0; group[key].total += s.total||0;
                  }
                  const monthly = Object.entries(group).sort((a,b) => a[1].d - b[1].d).map(([key, v]) => ({ key, ...v }));
                  const current = monthly[monthly.length-1];
                  const previous = monthly[monthly.length-2] || null;
                  const maxTwo = Math.max(current ? current.total : 1, previous ? previous.total : 1) || 1;
                  const r = 60; const C = Math.round(2 * Math.PI * r);
                  const pctCurr = current ? Math.max(0, Math.min(1, current.total / maxTwo)) : 0;
                  const pctPrev = previous ? Math.max(0, Math.min(1, previous.total / maxTwo)) : 0;
                  return (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Estadísticas de {currentUser.cafeteria}</h2>
                      <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="flex items-center justify-center">
                            <svg width="180" height="180" viewBox="0 0 180 180">
                              <circle cx="90" cy="90" r={r} fill="none" stroke="#eee" strokeWidth="14" />
                              <circle cx="90" cy="90" r={r} fill="none" stroke="#d97706" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.round(pctCurr*C)} ${C}`} strokeDashoffset={C*0.25} transform="rotate(-90 90 90)" />
                              <text x="90" y="86" textAnchor="middle" className="fill-gray-800" fontSize="16" fontWeight="700">{current ? current.d.toLocaleString(undefined, { month: 'short' }).toUpperCase() : '—'}</text>
                              <text x="90" y="106" textAnchor="middle" className="fill-amber-600" fontSize="14" fontWeight="700">{current ? `$${current.total.toLocaleString()}` : '—'}</text>
                            </svg>
                          </div>
                          <div className="flex items-center justify-center">
                            <svg width="180" height="180" viewBox="0 0 180 180">
                              <circle cx="90" cy="90" r={r} fill="none" stroke="#eee" strokeWidth="14" />
                              <circle cx="90" cy="90" r={r} fill="none" stroke="#f59e0b" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.round(pctPrev*C)} ${C}`} strokeDashoffset={C*0.25} transform="rotate(-90 90 90)" />
                              <text x="90" y="86" textAnchor="middle" className="fill-gray-800" fontSize="16" fontWeight="700">{previous ? previous.d.toLocaleString(undefined, { month: 'short' }).toUpperCase() : '—'}</text>
                              <text x="90" y="106" textAnchor="middle" className="fill-amber-600" fontSize="14" fontWeight="700">{previous ? `$${previous.total.toLocaleString()}` : '—'}</text>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mes</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ventas</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Subtotal</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">IVA</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Variación %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthly.slice().reverse().map((m, idxRev) => {
                              const idx = monthly.length - 1 - idxRev;
                              const prev = idx > 0 ? monthly[idx-1] : null;
                              const diff = prev ? m.total - prev.total : null;
                              const pct = prev && prev.total !== 0 ? Math.round((diff / prev.total) * 100) : null;
                              const monthName = m.d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
                              return (
                                <tr key={m.key} className="border-b">
                                  <td className="px-6 py-3 text-gray-800 capitalize">{monthName}</td>
                                  <td className="px-6 py-3 text-gray-800">{m.count}</td>
                                  <td className="px-6 py-3 text-gray-800">${m.subtotal.toLocaleString()}</td>
                                  <td className="px-6 py-3 text-gray-800">${m.tax.toLocaleString()}</td>
                                  <td className="px-6 py-3 font-semibold text-amber-600">${m.total.toLocaleString()}</td>
                                  <td className="px-6 py-3 text-gray-800">{pct !== null ? `${pct}%` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
              {isMgrProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setIsMgrProductModalOpen(false)}></div>
                  <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-md mx-4">
                    <div className="p-4 border-b flex justify-between items-center">
                      <h2 className="text-xl font-bold text-gray-800">Nuevo producto</h2>
                      <button onClick={() => setIsMgrProductModalOpen(false)} className="text-gray-600 hover:text-gray-800">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                        <input type="text" value={mgrNewProduct.name} onChange={(e) => setMgrNewProduct({ ...mgrNewProduct, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Precio</label>
                        <input type="number" min="0" value={mgrNewProduct.price} onChange={(e) => setMgrNewProduct({ ...mgrNewProduct, price: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                        <input type="number" min="0" value={mgrNewProduct.stock} onChange={(e) => setMgrNewProduct({ ...mgrNewProduct, stock: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <button
                        onClick={() => {
                          const name = (mgrNewProduct.name||'').trim();
                          const price = parseInt(mgrNewProduct.price);
                          const stock = parseInt(mgrNewProduct.stock);
                          if (!name || isNaN(price) || isNaN(stock)) return;
                          const id = Date.now();
                          const next = [...products, { id, name, price, stock, cafeteria: currentUser.cafeteria||'' }];
                          saveProducts(next);
                          setMgrNewProduct({ name: '', price: '', stock: '' });
                          setIsMgrProductModalOpen(false);
                        }}
                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                      >
                        Guardar producto
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {isMgrInvModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setIsMgrInvModalOpen(false)}></div>
                  <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-md mx-4">
                    <div className="p-4 border-b flex justify-between items-center">
                      <h2 className="text-xl font-bold text-gray-800">Nuevo ítem de inventario</h2>
                      <button onClick={() => setIsMgrInvModalOpen(false)} className="text-gray-600 hover:text-gray-800">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Artículo</label>
                        <input type="text" value={mgrNewInv.item} onChange={(e) => setMgrNewInv({ ...mgrNewInv, item: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad</label>
                        <input type="number" min="0" value={mgrNewInv.quantity} onChange={(e) => setMgrNewInv({ ...mgrNewInv, quantity: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad</label>
                        <input type="text" value={mgrNewInv.unit} onChange={(e) => setMgrNewInv({ ...mgrNewInv, unit: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Stock mínimo</label>
                        <input type="number" min="0" value={mgrNewInv.minStock} onChange={(e) => setMgrNewInv({ ...mgrNewInv, minStock: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                      </div>
                      <button
                        onClick={() => {
                          const item = (mgrNewInv.item||'').trim();
                          const quantity = parseInt(mgrNewInv.quantity);
                          const minStock = parseInt(mgrNewInv.minStock);
                          const unit = (mgrNewInv.unit||'').trim();
                          if (!item || isNaN(quantity) || isNaN(minStock) || !unit) return;
                          const id = Date.now();
                          const next = [...inventory, { id, item, quantity, unit, minStock, cafeteria: currentUser.cafeteria||'' }];
                          saveInventory(next);
                          setMgrNewInv({ item: '', quantity: '', unit: '', minStock: '' });
                          setIsMgrInvModalOpen(false);
                        }}
                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                      >
                        Guardar ítem
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Panel de Vendedor
  if (currentUser.role === 'vendedor') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-amber-600 text-white p-4 shadow-lg print:hidden">
          <div className="container mx-auto max-w-7xl px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Panel de Ventas</h1>
                <p className="text-sm text-amber-100">Usuario: {currentUser.username} • Cafetería: {currentUser.cafeteria || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 relative">
              <button
                onClick={() => setIsCartOpen(v => !v)}
                className="relative inline-flex items-center justify-center rounded-lg font-semibold transition bg-white/20 hover:bg-white/30 text-white gap-2 px-4 py-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Ver carrito
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 px-2 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMenuOpen(v => !v)}
                className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-white/20 hover:bg-white/30 text-white gap-2 px-4 py-2"
              >
                Menú
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg ring-1 ring-gray-200 w-44 z-10">
                  <button onClick={() => { setIsCloseShiftOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100">Cerrar turno</button>
                  <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100">Salir</button>
                </div>
              )}
            </div>
          </div>
        </header>

          <div className="container mx-auto max-w-7xl px-6 p-6 print:hidden">
          <div className={`grid gap-6 ${isCartOpen ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Productos</h2>
              <div className="mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {productsForStore.filter(p => p.name.toLowerCase().includes(queryLower)).map(product => (
                  <div key={product.id} className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-4 transition hover:shadow-lg hover:scale-[1.01]">
                    <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
                    <p className="text-2xl font-bold text-amber-600 my-2">
                      ${product.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">Stock: {product.stock}</p>
                    {(() => { const qty = selection[product.id] || 0; return (
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => decSelection(product.id)} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">-</button>
                        <span className="min-w-6 text-center font-semibold text-gray-800">{qty}</span>
                        <button onClick={() => incSelection(product.id)} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">+</button>
                      </div>
                    ); })()}
                    <button
                      onClick={() => addToCart(product)}
                      className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                    >
                      Agregar al carrito
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <aside className={`${isCartOpen ? 'block' : 'hidden'} bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-4 lg:p-6 print:hidden sticky top-24 self-start max-h-[calc(100vh-160px)] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Carrito</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-600 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Carrito vacío</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-[50vh] overflow-auto pr-1">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.quantity} x ${item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-amber-600">${(item.price * item.quantity).toLocaleString()}</p>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-600 hover:text-red-700 text-sm">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    {(() => {
                      return (
                        <>
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-700">Subtotal</span><span className="font-semibold">${computedTotals.subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-700">IVA ({Math.round(settings.taxRate*100)}%)</span><span className="font-semibold">${computedTotals.tax.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center"><span className="text-lg font-bold text-gray-800">Total</span><span className="text-2xl font-bold text-amber-600">${computedTotals.total.toLocaleString()}</span></div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Forma de pago</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                      <option value="efectivo">Efectivo</option>
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                  <button onClick={completeSale} className="inline-flex items-center justify-center rounded-lg font-semibold transition w-full bg-green-600 hover:bg-green-700 text-white py-3">
                    Completar Venta
                  </button>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>

        {isCloseShiftOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsCloseShiftOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-lg mx-4">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Cerrar turno</h2>
                <button onClick={() => setIsCloseShiftOpen(false)} className="text-gray-600 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {(() => {
                const start = new Date();
                start.setHours(0,0,0,0);
                const startMs = start.getTime();
                const mine = sales.filter(s => s.seller === currentUser.username && (s.ts || 0) >= startMs);
                const totals = mine.reduce((acc, s) => {
                  const m = s.paymentMethod || 'efectivo';
                  if (m === 'efectivo') acc.cash += s.total || 0; else acc.card += s.total || 0;
                  acc.count += 1;
                  acc.total += s.total || 0;
                  return acc;
                }, { cash: 0, card: 0, total: 0, count: 0 });
                const declaredCash = parseInt(closeShiftForm.cash || '0') || 0;
                const declaredCard = parseInt(closeShiftForm.card || '0') || 0;
                const diffCash = declaredCash - totals.cash;
                const diffCard = declaredCard - totals.card;
                return (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Ventas del día</p>
                        <p className="text-2xl font-bold text-gray-800">{totals.count}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-600">Total del día</p>
                        <p className="text-2xl font-bold text-amber-600">${totals.total.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 ring-1 ring-gray-100">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Efectivo esperado</p>
                        <p className="text-xl font-bold text-gray-800 mb-3">${totals.cash.toLocaleString()}</p>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Efectivo en caja</label>
                        <input type="number" value={closeShiftForm.cash} onChange={(e) => setCloseShiftForm({ ...closeShiftForm, cash: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
                        <p className={`mt-2 text-sm ${diffCash===0?'text-gray-600': (diffCash>0?'text-green-600':'text-red-600')}`}>{diffCash===0?'Cuadrado': diffCash>0?`Sobra $${diffCash.toLocaleString()}`:`Falta $${Math.abs(diffCash).toLocaleString()}`}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 ring-1 ring-gray-100">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Tarjeta esperada</p>
                        <p className="text-xl font-bold text-gray-800 mb-3">${totals.card.toLocaleString()}</p>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tarjeta declarada</label>
                        <input type="number" value={closeShiftForm.card} onChange={(e) => setCloseShiftForm({ ...closeShiftForm, card: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
                        <p className={`mt-2 text-sm ${diffCard===0?'text-gray-600': (diffCard>0?'text-green-600':'text-red-600')}`}>{diffCard===0?'Cuadrado': diffCard>0?`Sobra $${diffCard.toLocaleString()}`:`Falta $${Math.abs(diffCard).toLocaleString()}`}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const reports = JSON.parse(localStorage.getItem('shiftReports') || '[]');
                        const report = { user: currentUser.username, day: startMs, expected: totals, declared: { cash: declaredCash, card: declaredCard } };
                        reports.push(report);
                        localStorage.setItem('shiftReports', JSON.stringify(reports));
                        setIsCloseShiftOpen(false);
                        setCloseShiftForm({ cash: '', card: '' });
                        setIsMenuOpen(false);
                      }}
                      className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                    >
                      Confirmar cierre de turno
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {isReceiptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center print:items-start print:justify-start">
            <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setIsReceiptOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-md mx-4 print:w-[80mm] print:mx-auto print:shadow-none print:ring-0">
              <div className="p-4 border-b flex justify-between items-center print:hidden">
                <h2 className="text-xl font-bold text-gray-800">Boleta</h2>
                <button onClick={() => setIsReceiptOpen(false)} className="text-gray-600 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                {receipt ? (
                  <div className="mx-auto w-[360px] print:w-[80mm] text-gray-800 font-mono text-sm">
                    <div className="text-center">
                      <p className="uppercase tracking-widest font-bold">{settings.storeName}</p>
                      <p className="text-xs">Boleta de venta</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-2"></div>
                    <div className="flex justify-between text-xs">
                      <span>Fecha</span>
                      <span>{receipt.date}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Vendedor</span>
                      <span>{receipt.seller}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>No.</span>
                      <span>{receipt.id}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-2"></div>
                    <div className="space-y-2">
                      {receipt.items.map(item => (
                        <div key={item.id} className="grid grid-cols-[auto,1fr,auto] items-center gap-2 py-1">
                          <span className="text-gray-700">{item.quantity} x</span>
                          <span className="text-gray-700 truncate">{item.name}</span>
                          <span className="font-semibold">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-2"></div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Subtotal</span>
                        <span>${receipt.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>IVA ({Math.round(receipt.taxRate * 100)}%)</span>
                        <span>${receipt.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <span className="text-base font-bold">${receipt.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Pago</span>
                        <span>{receipt.paymentMethod ? (receipt.paymentMethod==='efectivo'?'Efectivo': receipt.paymentMethod==='debito'?'Débito':'Crédito') : '—'}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500">
                      <p>No válido como factura</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 my-2"></div>
                    <p className="text-center text-[10px] text-gray-600">Gracias por su compra</p>

                    <div className="mt-4 grid grid-cols-2 gap-3 print:hidden">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center rounded-lg font-semibold transition w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2"
                      >
                        Imprimir
                      </button>
                      <button
                        onClick={() => setIsReceiptOpen(false)}
                        className="inline-flex items-center justify-center rounded-lg font-semibold transition w-full bg-amber-600 hover:bg-amber-700 text-white py-2"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Sin datos de boleta</p>
                )}
              </div>
            </div>
          </div>
        )}

        
      </div>
    );
  }

  // Panel de Inventario
  if (currentUser.role === 'inventario') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-amber-600 text-white p-4 shadow-lg">
          <div className="container-wide flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Panel de Inventario</h1>
                <p className="text-sm text-amber-100">Usuario: {currentUser.username} • Cafetería: {currentUser.cafeteria || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="btn btn-secondary flex items-center gap-2 px-4 py-2"
              >
                <LogOut className="w-5 h-5" />
                Salir
              </button>
            </div>
          </div>
        </header>

          <div className="container mx-auto max-w-7xl px-6 p-6">
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
            <div className="p-6 bg-amber-50 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Control de Stock</h2>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <input
                type="text"
                value={invQuery}
                onChange={(e) => setInvQuery(e.target.value)}
                placeholder="Buscar artículo..."
                className="w-full sm:max-w-sm px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex gap-3">
                <select value={invStatusFilter} onChange={(e) => setInvStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                  <option value="todos">Todos</option>
                  <option value="bajo">Stock bajo</option>
                  <option value="ok">Stock OK</option>
                </select>
                <select value={invSort} onChange={(e) => setInvSort(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                  <option value="none">Sin orden</option>
                  <option value="asc">Más bajo primero</option>
                  <option value="desc">Más alto primero</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Artículo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cantidad</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unidad</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stock Mínimo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actualizar</th>
                  </tr>
                </thead>
                <tbody>
                  {invFiltered.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{item.item}</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInventory(item.id, e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.unit}</td>
                      <td className="px-6 py-4 text-gray-600">{item.minStock}</td>
                      <td className="px-6 py-4">
                        {item.quantity <= item.minStock ? (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                            ⚠️ Bajo
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                            ✓ OK
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => alert(`Stock actualizado: ${item.item}`)}
                          className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm"
                        >
                          Guardar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Items</h3>
              <p className="text-3xl font-bold text-amber-600">{inventory.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Stock Bajo</h3>
              <p className="text-3xl font-bold text-red-600">
                {inventory.filter(i => i.quantity <= i.minStock).length}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Stock OK</h3>
              <p className="text-3xl font-bold text-green-600">
                {inventory.filter(i => i.quantity > i.minStock).length}
              </p>
            </div>
          </div>
        </div>
        
      </div>
    );
  }

  if (currentUser.role === 'admin') {
    const handleCreateUser = async () => {
      const username = (newUser.username||'').trim();
      const email = (newUser.email||'').trim().toLowerCase();
      const role = newUser.role||'vendedor';
      const cafeteria = (newUser.cafeteria||'').trim();
      const password = newUser.password || '';
      if (!username || !email) {
        setUserError('Completa usuario y correo');
        return;
      }
      if (!password || password.length < 6) {
        setUserError('Contraseña mínima de 6 caracteres');
        return;
      }
      const emailTaken = Object.values(users).some(u => (u.email||'').toLowerCase() === email.toLowerCase());
      if (users[username]) {
        setUserError('El usuario ya existe');
        return;
      }
      if (emailTaken) {
        setUserError('El correo ya existe');
        return;
      }
      try {
        if (!auth || !db) { setUserError('Configura Firebase'); return; }
        const tempApp = initializeApp(firebaseConfig, 'temp');
        const tempAuth = getAuth(tempApp);
        await createUserWithEmailAndPassword(tempAuth, email, password);
        try { await deleteApp(tempApp); } catch {}
        await setDoc(doc(db, 'users', username), { username, email, role, cafeteria });
      } catch (err) {
        setUserError('No se pudo crear el usuario');
        return;
      }
      const next = { ...users, [username]: { username, email, role, cafeteria } };
      saveUsers(next);
      setNewUser({ username: '', email: '', password: '', role: 'vendedor', cafeteria: '' });
      setUserError('');
    };
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-amber-600 text-white p-4 shadow-lg">
          <div className="container mx-auto max-w-7xl px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Panel de Admin</h1>
                <p className="text-sm text-amber-100">Usuario: {currentUser.username} • Cafetería: {currentUser.cafeteria || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-white/20 hover:bg-white/30 text-white gap-2 px-4 py-2"
              >
                <Settings className="w-5 h-5" />
                Ajustes
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-700 hover:bg-amber-800 text-white gap-2 px-4 py-2"
              >
                <LogOut className="w-5 h-5" />
                Salir
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto max-w-7xl px-6 p-6">
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100">
            <div className="p-4 border-b flex gap-2">
              <button onClick={() => setAdminTab('ventas')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${adminTab==='ventas'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Ventas</button>
              <button onClick={() => setAdminTab('inventario')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${adminTab==='inventario'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Inventario</button>
              <button onClick={() => setAdminTab('productos')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${adminTab==='productos'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Productos</button>
              <button onClick={() => setAdminTab('usuarios')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${adminTab==='usuarios'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Usuarios</button>
              <button onClick={() => setAdminTab('estadisticas')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${adminTab==='estadisticas'?'bg-amber-600 text-white':'bg-gray-100 text-gray-800'}`}>Estadísticas</button>
            </div>
            <div className="p-6">
              {adminTab === 'ventas' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Ventas</h2>
                  {(() => { const stores = Array.from(new Set(Object.values(users).map(u => u.cafeteria).filter(Boolean))); return (
                    <div className="mb-3 flex items-center gap-3">
                      <label className="text-sm text-gray-700">Filtrar por cafetería</label>
                      <select value={adminStoreFilter} onChange={(e) => setAdminStoreFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                        <option value="">Todas</option>
                        {stores.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ); })()}
                  {sales.length === 0 ? (
                    <p className="text-gray-600">Sin ventas registradas</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Vendedor</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Subtotal</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">IVA</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.filter(s => !adminStoreFilter || s.cafeteria === adminStoreFilter).map(s => (
                            <tr key={s.id} className="border-b">
                              <td className="px-6 py-3 text-gray-800">{s.date}</td>
                              <td className="px-6 py-3 text-gray-800">{s.seller}</td>
                              <td className="px-6 py-3 text-gray-800">{s.items.length}</td>
                              <td className="px-6 py-3 text-gray-800">${s.subtotal.toLocaleString()}</td>
                              <td className="px-6 py-3 text-gray-800">${s.tax.toLocaleString()}</td>
                              <td className="px-6 py-3 font-semibold text-amber-600">${s.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {adminTab === 'inventario' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Inventario</h2>
                  <div className="mb-4 flex justify-end">
                    <button onClick={() => setIsAdminInvModalOpen(true)} className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm">Nuevo ítem</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Artículo</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cantidad</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unidad</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stock Mínimo</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actualizar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="px-6 py-3 font-medium text-gray-800">{item.item}</td>
                            <td className="px-6 py-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateInventory(item.id, e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                              />
                            </td>
                            <td className="px-6 py-3 text-gray-600">{item.unit}</td>
                            <td className="px-6 py-3 text-gray-600">{item.minStock}</td>
                            <td className="px-6 py-3">
                              {item.quantity <= item.minStock ? (
                                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">Bajo</span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">OK</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <button
                                onClick={() => alert(`Stock actualizado: ${item.item}`)}
                                className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm"
                              >
                                Guardar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isAdminInvModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50" onClick={() => setIsAdminInvModalOpen(false)}></div>
                      <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-md mx-4">
                        <div className="p-4 border-b flex justify-between items-center">
                          <h2 className="text-xl font-bold text-gray-800">Nuevo ítem de inventario</h2>
                          <button onClick={() => setIsAdminInvModalOpen(false)} className="text-gray-600 hover:text-gray-800">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Artículo</label>
                            <input type="text" value={adminNewInv.item} onChange={(e) => setAdminNewInv({ ...adminNewInv, item: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad</label>
                              <input type="number" min="0" value={adminNewInv.quantity} onChange={(e) => setAdminNewInv({ ...adminNewInv, quantity: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Stock mínimo</label>
                              <input type="number" min="0" value={adminNewInv.minStock} onChange={(e) => setAdminNewInv({ ...adminNewInv, minStock: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad</label>
                            <input type="text" value={adminNewInv.unit} onChange={(e) => setAdminNewInv({ ...adminNewInv, unit: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                          </div>
                          {(() => { const stores = Array.from(new Set(Object.values(users).map(u => u.cafeteria).filter(Boolean))); return (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Cafetería</label>
                              <select value={adminNewInv.cafeteria} onChange={(e) => setAdminNewInv({ ...adminNewInv, cafeteria: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                                <option value="">Selecciona cafetería</option>
                                {stores.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          ); })()}
                          <button
                            onClick={() => {
                              const item = (adminNewInv.item||'').trim();
                              const quantity = parseInt(adminNewInv.quantity);
                              const minStock = parseInt(adminNewInv.minStock);
                              const unit = (adminNewInv.unit||'').trim();
                              const cafeteria = (adminNewInv.cafeteria||'').trim();
                              if (!item || isNaN(quantity) || isNaN(minStock) || !unit || !cafeteria) return;
                              const id = Date.now();
                              const next = [...inventory, { id, item, quantity, unit, minStock, cafeteria }];
                              saveInventory(next);
                              setAdminNewInv({ item: '', quantity: '', unit: '', minStock: '', cafeteria: '' });
                              setIsAdminInvModalOpen(false);
                            }}
                            className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                          >
                            Guardar ítem
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {adminTab === 'productos' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Productos</h2>
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">Total: {products.length}</div>
                    <button onClick={() => setIsProductModalOpen(true)} className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm">Nuevo producto</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Precio</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cafetería</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} className="border-b">
                            <td className="px-6 py-3 text-gray-800">{p.name}</td>
                            <td className="px-6 py-3 text-gray-800">${p.price.toLocaleString()}</td>
                            <td className="px-6 py-3 text-gray-800">{p.stock}</td>
                            <td className="px-6 py-3 text-gray-800">{p.cafeteria || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isProductModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50" onClick={() => setIsProductModalOpen(false)}></div>
                      <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-md mx-4">
                        <div className="p-4 border-b flex justify-between items-center">
                          <h2 className="text-xl font-bold text-gray-800">Crear producto</h2>
                          <button onClick={() => setIsProductModalOpen(false)} className="text-gray-600 hover:text-gray-800">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                            <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Precio</label>
                            <input type="number" min="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                            <input type="number" min="0" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Cafetería</label>
                            <input type="text" value={newProduct.cafeteria} onChange={(e) => setNewProduct({ ...newProduct, cafeteria: e.target.value })} placeholder="Ej. Cafetería Norte" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                          </div>
                          <button
                            onClick={() => {
                              const name = (newProduct.name || '').trim();
                              const price = parseInt(newProduct.price);
                              const stock = parseInt(newProduct.stock);
                              const cafeteria = (newProduct.cafeteria||'').trim();
                              if (!name || isNaN(price) || isNaN(stock)) return;
                              const id = Date.now();
                              const next = [...products, { id, name, price, stock, cafeteria }];
                              saveProducts(next);
                              setNewProduct({ name: '', price: '', stock: '', cafeteria: '' });
                              setIsProductModalOpen(false);
                            }}
                            className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                          >
                            Guardar producto
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {adminTab === 'usuarios' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Usuarios</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Crear cuenta</h3>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          placeholder="Usuario"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="Correo"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Contraseña"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="inventario">Inventario</option>
                          <option value="encargado">Encargado de tienda</option>
                        </select>
                        <input
                          type="text"
                          value={newUser.cafeteria}
                          onChange={(e) => setNewUser({ ...newUser, cafeteria: e.target.value })}
                          placeholder="Cafetería (ej. Cafetería Norte)"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                        {userError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{userError}</div>
                        )}
                        <button
                          onClick={handleCreateUser}
                          className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 w-full py-2"
                        >
                          Crear usuario
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Listado</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Usuario</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Correo</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Cafetería</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(users).map(u => (
                              <tr key={u.username} className="border-b">
                                <td className="px-6 py-3 text-gray-800">{editUser?.originalUsername === u.username ? (
                                  <input
                                    type="text"
                                    value={editUser.username}
                                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                ) : (
                                  u.username
                                )}</td>
                                <td className="px-6 py-3 text-gray-600">{editUser?.originalUsername === u.username ? (
                                  <input
                                    type="email"
                                    value={editUser.email || ''}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                ) : (
                                  u.email || '—'
                                )}</td>
                                <td className="px-6 py-3 text-gray-600">{editUser?.originalUsername === u.username ? (
                                  <select
                                    value={editUser.role}
                                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                  >
                                    <option value="vendedor">Vendedor</option>
                                    <option value="inventario">Inventario</option>
                                    <option value="encargado">Encargado de tienda</option>
                                  </select>
                                ) : (
                                  u.role
                                )}</td>
                                <td className="px-6 py-3 text-gray-600">{editUser?.originalUsername === u.username ? (
                                  <input
                                    type="text"
                                    value={editUser.cafeteria || ''}
                                    onChange={(e) => setEditUser({ ...editUser, cafeteria: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                ) : (
                                  u.cafeteria || '—'
                                )}</td>
                                <td className="px-6 py-3 text-gray-600">
                                  {editUser?.originalUsername === u.username ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          const original = editUser.originalUsername;
                                          const newName = (editUser.username || '').trim();
                                          const newEmail = (editUser.email || '').trim();
                                          if (!newName) { setUserError('Usuario vacío'); return; }
                                          if (original === 'admin') return;
                                          if (original === currentUser.username) return;
                                          if (newName !== original && users[newName]) { setUserError('El usuario ya existe'); return; }
                                          if (!newEmail) { setUserError('Correo vacío'); return; }
                                          const emailTaken = Object.values(users).some(u => (u.email||'').toLowerCase() === newEmail.toLowerCase() && u.username !== original);
                                          if (emailTaken) { setUserError('El correo ya existe'); return; }
                                          if (newName !== original) {
                                            await deleteDoc(doc(db, 'users', original));
                                            await setDoc(doc(db, 'users', newName), { username: newName, email: newEmail, role: editUser.role, cafeteria: (editUser.cafeteria ?? users[original].cafeteria) || '' });
                                          } else {
                                            await updateDoc(doc(db, 'users', original), { email: newEmail, role: editUser.role, cafeteria: (editUser.cafeteria ?? users[original].cafeteria) || '' });
                                          }
                                          const next = { ...users };
                                          const updated = { username: newName, email: newEmail, role: editUser.role, cafeteria: (editUser.cafeteria ?? users[original].cafeteria) || '' };
                                          if (newName !== original) delete next[original];
                                          next[newName] = updated;
                                          saveUsers(next);
                                          setEditUser(null);
                                          setUserError('');
                                        }}
                                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-3 py-2 text-sm"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        onClick={() => setEditUser(null)}
                                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-gray-100 text-gray-800 hover:bg-gray-200 px-3 py-2 text-sm"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setEditUser({ originalUsername: u.username, username: u.username, role: u.role, email: u.email || '', password: '' })}
                                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-gray-100 text-gray-800 hover:bg-gray-200 px-3 py-2 text-sm"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (u.username === 'admin' || u.username === currentUser.username) return;
                                          if (!confirm(`Eliminar usuario "${u.username}"?`)) return;
                                          await deleteDoc(doc(db, 'users', u.username));
                                          const next = { ...users };
                                          delete next[u.username];
                                          saveUsers(next);
                                        }}
                                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-red-600 text-white hover:bg-red-700 px-3 py-2 text-sm"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Locales</h3>
                      {(() => { const stores = Array.from(new Set(Object.values(users).map(u => u.cafeteria).filter(Boolean))); return (
                        <div className="space-y-2">
                          {stores.length === 0 ? (
                            <p className="text-gray-600">Sin locales</p>
                          ) : stores.map(store => (
                            <div key={store} className="flex items-center justify-between border rounded-lg px-3 py-2">
                              <span className="text-gray-800">{store}</span>
                              <button
                                onClick={async () => {
                                  if (store === (currentUser.cafeteria||'')) return;
                                  if (!confirm(`Eliminar el local "${store}" y todos sus datos?`)) return;
                                  const toDelete = Object.values(users).filter(u => (u.cafeteria||'') === store).map(u => u.username);
                                  for (const uname of toDelete) { await deleteDoc(doc(db, 'users', uname)); }
                                  const nextUsers = { ...users }; toDelete.forEach(un => { delete nextUsers[un]; }); saveUsers(nextUsers);
                                  const nextProducts = products.filter(p => p.cafeteria !== store); saveProducts(nextProducts);
                                  const nextInventory = inventory.filter(i => i.cafeteria !== store); saveInventory(nextInventory);
                                  const nextSales = sales.filter(s => s.cafeteria !== store); saveSales(nextSales);
                                }}
                                className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-red-600 text-white hover:bg-red-700 px-3 py-1 text-sm"
                              >
                                Borrar local
                              </button>
                            </div>
                          ))}
                        </div>
                      ); })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
              {adminTab === 'estadisticas' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Estadísticas mensuales</h2>
                  {(() => { const stores = Array.from(new Set(Object.values(users).map(u => u.cafeteria).filter(Boolean))); return (
                    <div className="mb-3 flex items-center gap-3">
                      <label className="text-sm text-gray-700">Filtrar por cafetería</label>
                      <select value={statsStoreFilter} onChange={(e) => setStatsStoreFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                        <option value="">Todas</option>
                        {stores.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ); })()}
                  {sales.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-600">Sin ventas registradas</p>
                      <button
                        onClick={() => {
                          const now = new Date();
                          const prev = new Date(now.getFullYear(), now.getMonth()-1, 15);
                          const mkSale = (d, seller, subtotal, taxRate) => {
                            const tax = Math.round(subtotal * taxRate);
                            const total = subtotal + tax;
                            const ts = new Date(d).getTime();
                            return {
                              id: ts,
                              ts,
                              date: new Date(ts).toLocaleString(),
                              seller,
                              items: [{ id: 99, name: 'Ejemplo', quantity: 1, price: subtotal }],
                              subtotal,
                              tax,
                              taxRate,
                              total
                            };
                          };
                          const ex = [
                            mkSale(new Date(now.getFullYear(), now.getMonth(), 5), 'vendedor', 45000, settings.taxRate),
                            mkSale(new Date(now.getFullYear(), now.getMonth(), 10), 'vendedor', 32000, settings.taxRate),
                            mkSale(new Date(now.getFullYear(), now.getMonth(), 18), 'vendedor', 28000, settings.taxRate),
                            mkSale(new Date(now.getFullYear(), now.getMonth(), 22), 'vendedor', 54000, settings.taxRate),
                            mkSale(new Date(prev.getFullYear(), prev.getMonth(), 6), 'vendedor', 30000, settings.taxRate),
                            mkSale(new Date(prev.getFullYear(), prev.getMonth(), 19), 'vendedor', 41000, settings.taxRate)
                          ];
                          saveSales([...ex, ...sales]);
                        }}
                        className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2"
                      >
                        Cargar datos de ejemplo
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const base = sales.filter(s => !statsStoreFilter || s.cafeteria === statsStoreFilter);
                      const group = {};
                      for (const s of base) {
                        const ms = s.ts ?? s.id ?? Date.parse(s.date);
                        const d = new Date(ms);
                        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                        if (!group[key]) group[key] = { count: 0, subtotal: 0, tax: 0, total: 0, d };
                        group[key].count += 1;
                        group[key].subtotal += s.subtotal || 0;
                        group[key].tax += s.tax || 0;
                        group[key].total += s.total || 0;
                      }
                      const monthly = Object.entries(group)
                        .sort((a,b) => a[1].d - b[1].d)
                        .map(([key, v]) => ({ key, ...v }));
                      const current = monthly[monthly.length-1];
                      const previous = monthly[monthly.length-2] || null;
                      const maxTwo = Math.max(current.total, previous ? previous.total : current.total) || 1;
                      const r = 60;
                      const C = Math.round(2 * Math.PI * r);
                      const pctCurr = Math.max(0, Math.min(1, current.total / maxTwo));
                      const pctPrev = previous ? Math.max(0, Math.min(1, previous.total / maxTwo)) : 0;
                      return (
                        <>
                          <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="flex items-center justify-center">
                                <svg width="180" height="180" viewBox="0 0 180 180">
                                  <circle cx="90" cy="90" r={r} fill="none" stroke="#eee" strokeWidth="14" />
                                  <circle cx="90" cy="90" r={r} fill="none" stroke="#d97706" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.round(pctCurr*C)} ${C}`} strokeDashoffset={C*0.25} transform="rotate(-90 90 90)" />
                                  <text x="90" y="86" textAnchor="middle" className="fill-gray-800" fontSize="16" fontWeight="700">{current.d.toLocaleString(undefined, { month: 'short' }).toUpperCase()}</text>
                                  <text x="90" y="106" textAnchor="middle" className="fill-amber-600" fontSize="14" fontWeight="700">${current.total.toLocaleString()}</text>
                                </svg>
                              </div>
                              <div className="flex items-center justify-center">
                                <svg width="180" height="180" viewBox="0 0 180 180">
                                  <circle cx="90" cy="90" r={r} fill="none" stroke="#eee" strokeWidth="14" />
                                  <circle cx="90" cy="90" r={r} fill="none" stroke="#f59e0b" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.round(pctPrev*C)} ${C}`} strokeDashoffset={C*0.25} transform="rotate(-90 90 90)" />
                                  <text x="90" y="86" textAnchor="middle" className="fill-gray-800" fontSize="16" fontWeight="700">{previous ? previous.d.toLocaleString(undefined, { month: 'short' }).toUpperCase() : '—'}</text>
                                  <text x="90" y="106" textAnchor="middle" className="fill-amber-600" fontSize="14" fontWeight="700">{previous ? `$${previous.total.toLocaleString()}` : '—'}</text>
                                </svg>
                              </div>
                            </div>
                            <div className="text-center mt-2 text-sm">
                              {previous ? (() => { const diff = current.total - previous.total; const pct = previous.total !== 0 ? Math.round((diff/previous.total)*100) : 0; const up = diff >= 0; return <span className={`${up?'text-green-600':'text-red-600'} font-semibold`}>{up?'▲':'▼'} {Math.abs(pct)}% vs mes anterior</span>; })() : <span className="text-gray-600">Sin mes anterior</span>}
                            </div>
                          </div>
                          <div className="overflow-x-auto mb-4">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mes</th>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ventas</th>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Subtotal</th>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">IVA</th>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Variación %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthly.slice().reverse().map((m, idxRev) => {
                                  const idx = monthly.length - 1 - idxRev;
                                  const prev = idx > 0 ? monthly[idx-1] : null;
                                  const diff = prev ? m.total - prev.total : null;
                                  const pct = prev && prev.total !== 0 ? Math.round((diff / prev.total) * 100) : null;
                                  const monthName = m.d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
                                  return (
                                    <tr key={m.key} className="border-b">
                                      <td className="px-6 py-3 text-gray-800 capitalize">{monthName}</td>
                                      <td className="px-6 py-3 text-gray-800">{m.count}</td>
                                      <td className="px-6 py-3 text-gray-800">${m.subtotal.toLocaleString()}</td>
                                      <td className="px-6 py-3 text-gray-800">${m.tax.toLocaleString()}</td>
                                      <td className="px-6 py-3 font-semibold text-amber-600">${m.total.toLocaleString()}</td>
                                      <td className={`px-6 py-3 ${pct != null ? (pct >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>{pct != null ? `${pct}%` : '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <button
                            onClick={() => {
                              const headers = ['Mes','Ventas','Subtotal','IVA','Total','Variacion_%'];
                              const lines = [headers.join(';')];
                              monthly.forEach(m => {
                                const idx = monthly.findIndex(x => x.key === m.key);
                                const prev = idx > 0 ? monthly[idx-1] : null;
                                const diff = prev ? m.total - prev.total : null;
                                const pct = prev && prev.total !== 0 ? Math.round((diff / prev.total) * 100) : '';
                                const label = `${m.d.getFullYear()}-${String(m.d.getMonth()+1).padStart(2,'0')}`;
                                lines.push([label, m.count, m.subtotal, m.tax, m.total, pct].join(';'));
                              });
                              const csv = '\ufeff' + lines.join('\n');
                              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'ventas_mensuales.csv';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="inline-flex items-center justify-center rounded-lg font-semibold transition bg-amber-600 text-white hover:bg-amber-700 px-4 py-2"
                          >
                            Exportar a Excel (CSV)
                          </button>
                        </>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
            </div>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsSettingsOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl ring-2 ring-gray-300 w-full max-w-md mx-4">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Ajustes</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-600 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la tienda</label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => saveSettings({ ...settings, storeName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IVA (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={Math.round(settings.taxRate * 10000) / 100}
                    onChange={(e) => {
                      const pct = parseFloat(e.target.value);
                      const rate = isNaN(pct) ? 0 : pct / 100;
                      saveSettings({ ...settings, taxRate: rate });
                    }}
                    className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!settings.pricesIncludeTax}
                    onChange={(e) => saveSettings({ ...settings, pricesIncludeTax: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">Precios incluyen IVA</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CafeteriaSystem;
