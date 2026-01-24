/**
 * Компонент Brand
 * 
 * Отображает контент страницы с фоновым изображением
 * Принимает children для отображения содержимого страницы
 */

import React from 'react';
import './brand.css';

function Brand({ children }) {
    return (
        <div className="brand-content">
            {children}
        </div>
    );
}

export default Brand;
