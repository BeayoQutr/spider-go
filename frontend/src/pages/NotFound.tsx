import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-gray-500 mt-4 mb-8">页面不存在</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
          返回首页
        </Link>
      </div>
    </div>
  )
}
