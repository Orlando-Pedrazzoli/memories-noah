import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { memoriesService } from '../../services/api';
import { Calendar, ChevronRight, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { year } = useParams();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = [
    { value: '0-12-months', label: '0-12 meses', icon: '👶' },
    { value: '1-year', label: '1 ano', icon: '🚼' },
    { value: '2-years', label: '2 anos', icon: '🧒' },
    { value: '3-years', label: '3 anos', icon: '👦' },
    { value: '4-years', label: '4 anos', icon: '🧑' },
    { value: '5-years', label: '5 anos', icon: '👨' },
    { value: '6-years', label: '6 anos', icon: '🧒' },
    { value: '7-years', label: '7 anos', icon: '👦' },
    { value: '8-years', label: '8 anos', icon: '🧑' },
    { value: '9-years', label: '9 anos', icon: '👨‍🎓' },
    { value: '10-years', label: '10 anos', icon: '🧑' },
  ];

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const response = await memoriesService.getMemoriesSummary();
      if (response.success) {
        setSummary(response.summary);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('Erro ao carregar resumo das memórias');
    } finally {
      setLoading(false);
    }
  };

  const getYearSummary = yearValue => {
    const yearSummary = summary.find(s => s.year === yearValue);
    return yearSummary || { photoCount: 0, schoolWorkCount: 0, totalCount: 0 };
  };

  return (
    <aside className='sticky top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg border-r border-gray-200 overflow-y-auto'>
      <div className='p-6'>
        <div className='flex items-center space-x-2 mb-6'>
          <Calendar className='h-5 w-5 text-primary-600' />
          <h2 className='text-lg font-semibold text-gray-900'>Idades</h2>
        </div>

        <nav className='space-y-2'>
          {yearOptions.map(option => {
            const isActive = year === option.value;
            const yearSummary = getYearSummary(option.value);

            return (
              <Link
                key={option.value}
                to={`/year/${option.value}`}
                className={`group flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'sidebar-active text-primary-800 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <div className='flex items-center space-x-3'>
                  <span className='text-lg'>{option.icon}</span>
                  <span>{option.label}</span>
                </div>

                <div className='flex items-center space-x-2'>
                  {yearSummary.totalCount > 0 && (
                    <div className='flex items-center space-x-1'>
                      <ImageIcon className='h-3 w-3 text-gray-400' />
                      <span
                        className={`text-xs ${
                          isActive ? 'text-primary-700' : 'text-gray-500'
                        }`}
                      >
                        {yearSummary.totalCount}
                      </span>
                    </div>
                  )}

                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isActive
                        ? 'text-primary-600 transform rotate-90'
                        : 'text-gray-400 group-hover:text-primary-500'
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Statistics Summary */}
        {!loading && summary.length > 0 && (
          <div className='mt-8 p-4 bg-gray-50 rounded-lg'>
            <h3 className='text-sm font-medium text-gray-900 mb-3'>
              Resumo Geral
            </h3>
            <div className='space-y-2 text-xs text-gray-600'>
              <div className='flex justify-between'>
                <span>Total de fotos:</span>
                <span className='font-medium'>
                  {summary.reduce((acc, curr) => acc + curr.photoCount, 0)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Trabalhos escolares:</span>
                <span className='font-medium'>
                  {summary.reduce((acc, curr) => acc + curr.schoolWorkCount, 0)}
                </span>
              </div>
              <div className='flex justify-between border-t border-gray-200 pt-2'>
                <span>Total de memórias:</span>
                <span className='font-semibold text-primary-600'>
                  {summary.reduce((acc, curr) => acc + curr.totalCount, 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className='mt-8 space-y-3'>
            {[1, 2, 3].map(i => (
              <div key={i} className='animate-pulse'>
                <div className='h-4 bg-gray-200 rounded'></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
