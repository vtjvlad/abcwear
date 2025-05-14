import seoTree from '../seo_keywords_tree2.json';
import { useState } from 'react';

const colorMap = {
  'black': '#222',
  'white': '#fff',
  'blue': '#2196f3',
  'red': '#f44336',
  'green': '#4caf50',
  'grey': '#888',
  'brown': '#795548',
  'pink': '#e91e63',
  'orange': '#ff9800',
  'yellow': '#ffeb3b',
  'purple': '#9c27b0',
  // додайте інші кольори за потреби
};

export default function SeoFilters({ category, subcategory, onFilterClick }) {
  // Знаходимо потрібну категорію та підкатегорію
  const catObj = seoTree.find(cat => cat.category === category);
  const subcatObj = catObj ? catObj.subcategories.find(sub => sub.name === subcategory) : null;
  const filters = subcatObj ? subcatObj.keywords : [];
  const [selected, setSelected] = useState([]);

  if (!filters.length) return <div className="seo-filters__empty">Фільтрів не знайдено</div>;

  const handleChange = (keyword) => {
    setSelected(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleApply = () => {
    if (onFilterClick && selected.length) {
      onFilterClick(selected);
    }
  };

  const handleClear = () => {
    setSelected([]);
    if (onFilterClick) onFilterClick([]);
  };

  return (
    <div className="seo-filters__container">
      <h3 className="seo-filters__title">Фільтри</h3>
      <ul className="seo-filters__list">
        {filters.map(f => (
          <li key={f.keyword} className="seo-filters__item">
            <label className="seo-filters__label">
              <input
                type="checkbox"
                checked={selected.includes(f.keyword)}
                onChange={() => handleChange(f.keyword)}
              />
              <span className="seo-filters__checkmark"></span>
              {colorMap[f.keyword.toLowerCase()] && (
                <span
                  className="seo-filters__color"
                  style={{ background: colorMap[f.keyword.toLowerCase()] }}
                  title={f.keyword}
                />
              )}
              <span className="seo-filters__text">{f.keyword}</span>
              <span className="seo-filters__count">({f.count})</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="seo-filters__actions">
        <button className="seo-filters__btn seo-filters__btn--clear" onClick={handleClear} type="button">Очистити</button>
        <button className="seo-filters__btn seo-filters__btn--apply" onClick={handleApply} type="button">Застосувати</button>
      </div>
      <style jsx>{`
        .seo-filters__container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          padding: 24px;
          max-width: 350px;
          margin: 0 auto;
        }
        .seo-filters__title {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 18px;
        }
        .seo-filters__list {
          list-style: none;
          padding: 0;
          margin: 0 0 18px 0;
          max-height: 260px;
          overflow-y: auto;
        }
        .seo-filters__item {
          margin-bottom: 10px;
        }
        .seo-filters__label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 1rem;
          border-radius: 6px;
          padding: 6px 8px;
          transition: background 0.2s;
        }
        .seo-filters__label:hover {
          background: #f5f5f5;
        }
        .seo-filters__color {
          display: inline-block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid #ddd;
        }
        .seo-filters__text {
          margin-right: 6px;
        }
        .seo-filters__count {
          color: #888;
          font-size: 0.95em;
        }
        .seo-filters__checkmark {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid #bbb;
          border-radius: 4px;
          margin-right: 8px;
          background: #fff;
          position: relative;
        }
        input[type="checkbox"] {
          display: none;
        }
        input[type="checkbox"]:checked + .seo-filters__checkmark {
          background: #2196f3;
          border-color: #2196f3;
        }
        input[type="checkbox"]:checked + .seo-filters__checkmark:after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 10px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .seo-filters__actions {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .seo-filters__btn {
          padding: 8px 18px;
          border-radius: 6px;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s, color 0.2s;
        }
        .seo-filters__btn--clear {
          background: #f5f5f5;
          color: #888;
        }
        .seo-filters__btn--clear:hover {
          background: #e0e0e0;
        }
        .seo-filters__btn--apply {
          background: #2196f3;
          color: #fff;
        }
        .seo-filters__btn--apply:hover {
          background: #1769aa;
        }
        @media (max-width: 600px) {
          .seo-filters__container {
            padding: 12px;
            max-width: 100%;
          }
          .seo-filters__title {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
} 