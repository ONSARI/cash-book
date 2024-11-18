import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { Download, Trash2, LogOut } from 'lucide-react';

function App() {
  const [movements, setMovements] = useState([]);
  const [date, setDate] = useState('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(collection(db, 'movements'), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMovements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Loaded movements:', newMovements);
        setMovements(newMovements);
      }, (error) => {
        console.error("Error in snapshot listener:", error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up listener:", error);
    }
  }, [user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const auth = getAuth();
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      console.log("Login successful:", result.user);
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        alert('Error: This domain is not authorized. Please contact the administrator.');
      } else {
        alert('Login error: ' + error.message);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      alert('Logout error: ' + error.message);
    }
  };

  const addMovement = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to add movements');
      return;
    }

    if (!date || !concept || !amount) {
      alert('Please complete all fields');
      return;
    }

    try {
      console.log('Adding movement:', {
        date,
        concept,
        amount: parseFloat(amount),
        type,
        userEmail: user.email
      });

      const docRef = await addDoc(collection(db, 'movements'), {
        date,
        concept,
        amount: parseFloat(amount),
        type,
        createdAt: new Date(),
        userId: user.uid,
        userEmail: user.email
      });

      console.log('Document written with ID:', docRef.id);
      setDate('');
      setConcept('');
      setAmount('');
    } catch (error) {
      console.error('Full error:', error);
      alert('Error adding movement: ' + error.message);
    }
  };

  const deleteMovement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this movement?')) return;
    
    try {
      await deleteDoc(doc(db, 'movements', id));
    } catch (error) {
      alert('Error deleting movement: ' + error.message);
    }
  };

  const calculateTotals = () => {
    return movements.reduce((acc, mov) => ({
      income: mov.type === 'income' ? acc.income + mov.amount : acc.income,
      expenses: mov.type === 'expense' ? acc.expenses + mov.amount : acc.expenses,
      balance: mov.type === 'income' ? acc.balance + mov.amount : acc.balance - mov.amount
    }), { income: 0, expenses: 0, balance: 0 });
  };

  const exportToCSV = () => {
    const { income, expenses, balance } = calculateTotals();
    const csvContent = [
      ['Date', 'Concept', 'Income', 'Expense', 'Added By', 'Balance'],
      ...movements.map(mov => [
        mov.date,
        mov.concept,
        mov.type === 'income' ? mov.amount.toFixed(2) : '',
        mov.type === 'expense' ? mov.amount.toFixed(2) : '',
        mov.userEmail || 'Unknown',
        ''
      ]),
      ['TOTALS', '', income.toFixed(2), expenses.toFixed(2), '', balance.toFixed(2)]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cash_book_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Cash Book</h1>
        <button
          onClick={login}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const { income, expenses, balance } = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cash Book</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Download size={20} />
            Export CSV
          </button>
          <span>{user.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg">
          <p className="text-sm text-green-800">Total Income</p>
          <p className="text-2xl font-bold text-green-800">${income.toFixed(2)}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <p className="text-sm text-red-800">Total Expenses</p>
          <p className="text-2xl font-bold text-red-800">${expenses.toFixed(2)}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <p className="text-sm text-blue-800">Current Balance</p>
          <p className="text-2xl font-bold text-blue-800">${balance.toFixed(2)}</p>
        </div>
      </div>

      <form onSubmit={addMovement} className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Concept</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="w-full mt-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Add Movement
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concept</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Income</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expense</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movements.map((mov) => (
              <tr key={mov.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{mov.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{mov.concept}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                  {mov.type === 'income' ? `$${mov.amount.toFixed(2)}` : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                  {mov.type === 'expense' ? `$${mov.amount.toFixed(2)}` : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {mov.userEmail || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => deleteMovement(mov.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan="2" className="px-6 py-4 text-right font-medium">Totals:</td>
              <td className="px-6 py-4 text-right text-green-600 font-medium">${income.toFixed(2)}</td>
              <td className="px-6 py-4 text-right text-red-600 font-medium">${expenses.toFixed(2)}</td>
              <td colSpan="2"></td>
            </tr>
            <tr>
              <td colSpan="2" className="px-6 py-4 text-right font-medium">Balance:</td>
              <td colSpan="2" className="px-6 py-4 text-right font-bold text-blue-600">
                ${balance.toFixed(2)}
              </td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default App;