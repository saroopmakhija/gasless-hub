import { Route, Routes } from 'react-router'
import { SponsorsFeatureIndex } from './ui/sponsors-feature-index'

export default function SponsorsRoutes() {
  return (
    <Routes>
      <Route element={<SponsorsFeatureIndex />} index />
    </Routes>
  )
}

