import logo from './logo.svg';
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';

function Home() {
    return (
        <div className="p-3">
            <h2>Home Page</h2>
            <Link to="/settings" className="btn btn-primary">Go to Settings</Link>
        </div>
    );
}

function Settings() {
    return (
        <div className="p-3">
            <h2>Settings Page</h2>
            <Link to="/" className="btn btn-secondary">Back Home</Link>
        </div>
    );
}

function App() {
    return (
        <HashRouter>
            <div className="routes-app-container border p-3">
                <h1>My React App</h1>
                <hr />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </div>
        </HashRouter>
    );
}

export default App;
