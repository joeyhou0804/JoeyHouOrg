'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import dynamic from 'next/dynamic'
import Fuse from 'fuse.js'
import Footer from 'src/components/Footer'
import NavigationMenu from 'src/components/NavigationMenu'
import DestinationCard from 'src/components/DestinationCard'
import ViewHintsDrawer from 'src/components/ViewHintsDrawer'
import FilterByHomeDrawer from 'src/components/FilterByHomeDrawer'
import DestinationGroupSizeFilterDrawer from 'src/components/DestinationGroupSizeFilterDrawer'
import OtherFiltersDrawer from 'src/components/OtherFiltersDrawer'
import MixedText from 'src/components/MixedText'
import FilterDrawerBase from 'src/components/BaseDrawer'
import { useTranslation } from 'src/hooks/useTranslation'
import { vw, rvw, rShadow } from 'src/utils/scaling'
import { Search } from 'lucide-react'

// Dynamically import the map component to avoid SSR issues
const InteractiveMap = dynamic(() => import('src/components/InteractiveMap'), {
  ssr: false,
  loading: () => {
    const { tr } = useTranslation()
    return (
      <Box className="w-full bg-gray-200 flex items-center justify-center" sx={{ height: { xs: 'auto', md: vw(600) }, aspectRatio: { xs: '2/3', md: 'unset' }, borderRadius: rvw(8, 8) }}>
        <p className="text-gray-600">{tr.loadingMap}</p>
      </Box>
    )
  }
})

export default function StationsPage() {
  const { locale, tr } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuButtonVisible, setIsMenuButtonVisible] = useState(true)
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false)
  const [isMenuButtonAnimating, setIsMenuButtonAnimating] = useState(false)

  // Preload title images and backgrounds
  useEffect(() => {
    const preloadImages = [
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/destination_page_title_${locale}.jpg`,
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/destination_page_title_xs_${locale}.jpg`,
      '/images/backgrounds/homepage_background_2.webp',
      '/images/destinations/destination_page_map_background.webp',
      // Home location filter icons
      '/images/icons/filter/all_home_locations.png',
      '/images/icons/filter/new_york_icon.png',
      '/images/icons/filter/berkeley_icon.png',
      '/images/icons/filter/palo_alto_icon.png',
      '/images/icons/filter/san_francisco_icon.png',
      // Group size filter icons
      '/images/icons/filter/all_group_sizes.png',
      '/images/icons/filter/visit_by_myself.png',
      '/images/icons/filter/visit_with_others.png',
      // Other filter icons
      '/images/icons/filter/all_destination_icon.png',
      '/images/icons/filter/stay_overnight.png',
      '/images/icons/filter/visit_on_train.png',
      '/images/icons/filter/photo_stops_on_trains.png',
      '/images/icons/filter/visit_more_than_once.png'
    ]
    preloadImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [locale])
  const [xsDisplayCount, setXsDisplayCount] = useState(12)
  const [destinations, setDestinations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isViewHintsDrawerOpen, setIsViewHintsDrawerOpen] = useState(false)
  const [isFilterByHomeHovered, setIsFilterByHomeHovered] = useState(false)
  const [isFilterByGroupSizeHovered, setIsFilterByGroupSizeHovered] = useState(false)
  const [isOtherFiltersHovered, setIsOtherFiltersHovered] = useState(false)
  const [isFilterByHomeDrawerOpen, setIsFilterByHomeDrawerOpen] = useState(false)
  const [isGroupSizeFilterDrawerOpen, setIsGroupSizeFilterDrawerOpen] = useState(false)
  const [isOtherFiltersDrawerOpen, setIsOtherFiltersDrawerOpen] = useState(false)

  // Map section filters
  const [selectedMapHomeFilter, setSelectedMapHomeFilter] = useState<string>('all_destinations')
  const [selectedMapGroupSizeFilter, setSelectedMapGroupSizeFilter] = useState<string>('all_group_sizes')
  const [selectedMapOtherFilter, setSelectedMapOtherFilter] = useState<string>('all_destinations')

  // List section filters
  const [selectedListHomeFilter, setSelectedListHomeFilter] = useState<string>('all_destinations')
  const [selectedListGroupSizeFilter, setSelectedListGroupSizeFilter] = useState<string>('all_group_sizes')
  const [selectedListOtherFilter, setSelectedListOtherFilter] = useState<string>('all_destinations')

  const [homeLocations, setHomeLocations] = useState<any[]>([])
  const [isNoResultsDrawerOpen, setIsNoResultsDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMapFiltersContext, setIsMapFiltersContext] = useState(false)
  const lastShownFilterRef = useRef<string>('')
  const listSectionRef = useRef<HTMLDivElement>(null)

  // Recent destinations carousel state
  const [currentRecentDestSlide, setCurrentRecentDestSlide] = useState(0)
  const [isRecentDestTransitioning, setIsRecentDestTransitioning] = useState(false)

  const itemsPerPage = 12

  // Mapping of filter IDs to home location names (must match database exactly)
  const homeFilterMap: { [key: string]: string } = {
    'new_york': 'New York, NY',
    'berkeley': 'Berkeley, CA',
    'palo_alto': 'Palo Alto, CA',
    'san_francisco': 'San Francisco, CA'
  }

  // Mapping of filter IDs to icon paths
  const homeFilterIconMap: { [key: string]: string } = {
    'all_destinations': '/images/icons/filter/all_home_locations.png',
    'new_york': '/images/icons/filter/new_york_icon.png',
    'berkeley': '/images/icons/filter/berkeley_icon.png',
    'palo_alto': '/images/icons/filter/palo_alto_icon.png',
    'san_francisco': '/images/icons/filter/san_francisco_icon.png'
  }

  const groupSizeFilterIconMap: { [key: string]: string } = {
    'all_group_sizes': '/images/icons/filter/all_group_sizes.png',
    'visit_by_myself': '/images/icons/filter/visit_by_myself.png',
    'visit_with_others': '/images/icons/filter/visit_with_others.png'
  }

  const otherFilterIconMap: { [key: string]: string } = {
    'all_destinations': '/images/icons/filter/all_destination_icon.png',
    'stay_overnight': '/images/icons/filter/stay_overnight.png',
    'visit_on_train': '/images/icons/filter/visit_on_train.png',
    'photo_stops_on_trains': '/images/icons/filter/photo_stops_on_trains.png',
    'visit_more_than_once': '/images/icons/filter/visit_more_than_once.png'
  }

  // Fetch destinations from API
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const response = await fetch('/api/destinations')
        const data = await response.json()
        setDestinations(data)

        // Preload first image from each destination for map popups
        data.forEach((dest: any) => {
          if (dest.images && dest.images.length > 0) {
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = dest.images[0]
            document.head.appendChild(link)
          }
        })
      } catch (error) {
        console.error('Error fetching destinations:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDestinations()
  }, [])

  // Fetch home locations from API
  useEffect(() => {
    async function fetchHomeLocations() {
      try {
        const response = await fetch('/api/home-locations')
        const data = await response.json()
        setHomeLocations(data)
      } catch (error) {
        console.error('Error fetching home locations:', error)
      }
    }
    fetchHomeLocations()
  }, [])

  // Filter destinations by home location date range - MAP VERSION
  const filterMapDestinationsByHome = (destinations: any[]) => {
    if (selectedMapHomeFilter === 'all_destinations') {
      console.log('Map Filter: Showing all destinations')
      return destinations
    }

    const homeLocationName = homeFilterMap[selectedMapHomeFilter]
    console.log('Map Selected filter:', selectedMapHomeFilter, '→ Home location name:', homeLocationName)

    if (!homeLocationName) {
      console.warn('No mapping found for filter:', selectedMapHomeFilter)
      return destinations
    }

    // Find the matching home location
    const homeLocation = homeLocations.find(
      home => home.name === homeLocationName
    )

    console.log('Home locations available:', homeLocations.map(h => h.name))
    console.log('Matched home location:', homeLocation)

    if (!homeLocation) {
      console.warn('No home location found for:', homeLocationName)
      return destinations
    }

    // Filter destinations by date range
    const startDate = new Date(homeLocation.startDate)
    const endDate = new Date(homeLocation.endDate)

    console.log('Date range:', startDate, 'to', endDate)

    const filtered = destinations.filter(destination => {
      const destDate = new Date(destination.date)
      return destDate >= startDate && destDate <= endDate
    })

    console.log('Map Filtered destinations count:', filtered.length, 'out of', destinations.length)
    return filtered
  }

  // Filter destinations by home location date range - LIST VERSION
  const filterListDestinationsByHome = (destinations: any[]) => {
    if (selectedListHomeFilter === 'all_destinations') {
      console.log('List Filter: Showing all destinations')
      return destinations
    }

    const homeLocationName = homeFilterMap[selectedListHomeFilter]
    console.log('List Selected filter:', selectedListHomeFilter, '→ Home location name:', homeLocationName)

    if (!homeLocationName) {
      console.warn('No mapping found for filter:', selectedListHomeFilter)
      return destinations
    }

    // Find the matching home location
    const homeLocation = homeLocations.find(
      home => home.name === homeLocationName
    )

    console.log('Home locations available:', homeLocations.map(h => h.name))
    console.log('Matched home location:', homeLocation)

    if (!homeLocation) {
      console.warn('No home location found for:', homeLocationName)
      return destinations
    }

    // Filter destinations by date range
    const startDate = new Date(homeLocation.startDate)
    const endDate = new Date(homeLocation.endDate)

    console.log('Date range:', startDate, 'to', endDate)

    const filtered = destinations.filter(destination => {
      const destDate = new Date(destination.date)
      return destDate >= startDate && destDate <= endDate
    })

    console.log('List Filtered destinations count:', filtered.length, 'out of', destinations.length)
    return filtered
  }

  // Filter destinations by group size - MAP VERSION
  const filterMapDestinationsByGroupSize = (destinations: any[]) => {
    if (selectedMapGroupSizeFilter === 'all_group_sizes') {
      return destinations
    }

    switch (selectedMapGroupSizeFilter) {
      case 'visit_by_myself':
        // Only show destinations where visitedByMyself is true
        return destinations.filter(d => d.visitedByMyself === true)

      case 'visit_with_others':
        // Only show destinations where visitedByMyself is false
        return destinations.filter(d => d.visitedByMyself === false)

      default:
        return destinations
    }
  }

  // Filter destinations by group size - LIST VERSION
  const filterListDestinationsByGroupSize = (destinations: any[]) => {
    if (selectedListGroupSizeFilter === 'all_group_sizes') {
      return destinations
    }

    switch (selectedListGroupSizeFilter) {
      case 'visit_by_myself':
        // Only show destinations where visitedByMyself is true
        return destinations.filter(d => d.visitedByMyself === true)

      case 'visit_with_others':
        // Only show destinations where visitedByMyself is false
        return destinations.filter(d => d.visitedByMyself === false)

      default:
        return destinations
    }
  }

  // Filter destinations by other criteria - MAP VERSION
  const filterMapDestinationsByOther = (destinations: any[]) => {
    if (selectedMapOtherFilter === 'all_destinations') {
      console.log('Map Other filter: Showing all destinations')
      return destinations
    }

    console.log('Applying map other filter:', selectedMapOtherFilter)

    switch (selectedMapOtherFilter) {
      case 'stay_overnight':
        // Only show destinations where stayedOvernight is true
        return destinations.filter(d => d.stayedOvernight === true)

      case 'visit_on_train':
        // Only show destinations where visitedOnTrains is true
        return destinations.filter(d => d.visitedOnTrains === true)

      case 'photo_stops_on_trains':
        // Only show destinations where visitedOnTrains is true AND stayedOvernight is false
        return destinations.filter(d => d.visitedOnTrains === true && d.stayedOvernight === false)

      case 'visit_more_than_once':
        // Only show destinations visited more than once (same name)
        // Count visits by name (matching map's grouping logic)
        const nameCounts = new Map<string, number>()
        destinations.forEach(d => {
          const key = d.name
          nameCounts.set(key, (nameCounts.get(key) || 0) + 1)
        })

        // Filter to only show destinations with names that appear more than once
        return destinations.filter(d => {
          const key = d.name
          return (nameCounts.get(key) || 0) > 1
        })

      default:
        return destinations
    }
  }

  // Filter destinations by other criteria - LIST VERSION
  const filterListDestinationsByOther = (destinations: any[]) => {
    if (selectedListOtherFilter === 'all_destinations') {
      console.log('List Other filter: Showing all destinations')
      return destinations
    }

    console.log('Applying list other filter:', selectedListOtherFilter)

    switch (selectedListOtherFilter) {
      case 'stay_overnight':
        // Only show destinations where stayedOvernight is true
        return destinations.filter(d => d.stayedOvernight === true)

      case 'visit_on_train':
        // Only show destinations where visitedOnTrains is true
        return destinations.filter(d => d.visitedOnTrains === true)

      case 'photo_stops_on_trains':
        // Only show destinations where visitedOnTrains is true AND stayedOvernight is false
        return destinations.filter(d => d.visitedOnTrains === true && d.stayedOvernight === false)

      case 'visit_more_than_once':
        // Only show destinations visited more than once (same name)
        // Count visits by name (matching map's grouping logic)
        const nameCounts = new Map<string, number>()
        destinations.forEach(d => {
          const key = d.name
          nameCounts.set(key, (nameCounts.get(key) || 0) + 1)
        })

        // Filter to only show destinations with names that appear more than once
        return destinations.filter(d => {
          const key = d.name
          return (nameCounts.get(key) || 0) > 1
        })

      default:
        return destinations
    }
  }

  // Apply map filters - memoized to prevent unnecessary recalculations
  const filteredMapDestinations = useMemo(() => {
    const homeFilteredDestinations = filterMapDestinationsByHome(destinations)
    const groupSizeFilteredDestinations = filterMapDestinationsByGroupSize(homeFilteredDestinations)
    return filterMapDestinationsByOther(groupSizeFilteredDestinations)
  }, [destinations, homeLocations, selectedMapHomeFilter, selectedMapGroupSizeFilter, selectedMapOtherFilter])

  // Apply list filters - memoized to prevent unnecessary recalculations
  const filteredListDestinations = useMemo(() => {
    const homeFilteredDestinations = filterListDestinationsByHome(destinations)
    const groupSizeFilteredDestinations = filterListDestinationsByGroupSize(homeFilteredDestinations)
    return filterListDestinationsByOther(groupSizeFilteredDestinations)
  }, [destinations, homeLocations, selectedListHomeFilter, selectedListGroupSizeFilter, selectedListOtherFilter])

  // Apply intelligent search filter with fuzzy matching (on list destinations)
  const searchFilteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return filteredListDestinations

    // Configure Fuse.js for intelligent fuzzy search
    const fuse = new Fuse(filteredListDestinations, {
      keys: [
        { name: 'name', weight: 3 },           // Highest priority: English name
        { name: 'nameCN', weight: 3 },         // Highest priority: Chinese name
        { name: 'state', weight: 2 },          // Medium priority: State/province
        { name: 'journeyName', weight: 1.5 },  // Lower priority: Journey name (EN)
        { name: 'journeyNameCN', weight: 1.5 } // Lower priority: Journey name (CN)
      ],
      threshold: 0.4,              // Allow moderate fuzziness (0=exact, 1=match anything)
      distance: 100,               // Max distance for match location
      minMatchCharLength: 2,       // Require at least 2 characters to match
      ignoreLocation: true,        // Search anywhere in the string
      includeScore: true,          // Include relevance scores for ranking
      useExtendedSearch: false,
      findAllMatches: true
    })

    // Perform fuzzy search and return results sorted by relevance
    const results = fuse.search(searchQuery)
    return results.map(result => result.item)
  }, [filteredListDestinations, searchQuery])

  const sortedDestinations = useMemo(() => {
    return [...searchFilteredDestinations].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA // Always sort by latest first
    })
  }, [searchFilteredDestinations])

  const totalPages = Math.ceil(sortedDestinations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayedDestinations = sortedDestinations.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (listSectionRef.current) {
      listSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleMapHomeFilterChange = (filterId: string) => {
    setSelectedMapHomeFilter(filterId)
  }

  const handleMapGroupSizeFilterChange = (filterId: string) => {
    setSelectedMapGroupSizeFilter(filterId)
  }

  const handleMapOtherFilterChange = (filterId: string) => {
    setSelectedMapOtherFilter(filterId)
  }

  const handleListHomeFilterChange = (filterId: string) => {
    setSelectedListHomeFilter(filterId)
    setCurrentPage(1) // Reset to first page when filter changes
    setXsDisplayCount(itemsPerPage) // Reset xs display count when filter changes
  }

  const handleListGroupSizeFilterChange = (filterId: string) => {
    setSelectedListGroupSizeFilter(filterId)
    setCurrentPage(1) // Reset to first page when filter changes
    setXsDisplayCount(itemsPerPage) // Reset xs display count when filter changes
  }

  const handleListOtherFilterChange = (filterId: string) => {
    setSelectedListOtherFilter(filterId)
    setCurrentPage(1) // Reset to first page when filter changes
    setXsDisplayCount(itemsPerPage) // Reset xs display count when filter changes
  }

  // Check for no results after LIST filters are applied
  useEffect(() => {
    // Only check if all drawers are closed and a non-default filter is active
    const hasActiveFilter = selectedListHomeFilter !== 'all_destinations' || selectedListGroupSizeFilter !== 'all_group_sizes' || selectedListOtherFilter !== 'all_destinations'
    const allDrawersClosed = !isFilterByHomeDrawerOpen && !isGroupSizeFilterDrawerOpen && !isOtherFiltersDrawerOpen

    // Create a unique key for the current filter combination
    const currentFilterKey = `${selectedListHomeFilter}|${selectedListGroupSizeFilter}|${selectedListOtherFilter}`

    if (hasActiveFilter && allDrawersClosed && filteredListDestinations.length === 0) {
      // Only show drawer if we haven't shown it for this filter combination yet
      if (lastShownFilterRef.current !== currentFilterKey) {
        // Wait a bit for drawer close animation to complete
        const timer = setTimeout(() => {
          setIsNoResultsDrawerOpen(true)
          lastShownFilterRef.current = currentFilterKey
        }, 500)
        return () => clearTimeout(timer)
      }
    }

    // Reset the tracking when filters change and there ARE results
    if (filteredListDestinations.length > 0) {
      lastShownFilterRef.current = ''
    }
  }, [filteredListDestinations, isFilterByHomeDrawerOpen, isGroupSizeFilterDrawerOpen, isOtherFiltersDrawerOpen, selectedListHomeFilter, selectedListGroupSizeFilter, selectedListOtherFilter])

  const handleShowMore = () => {
    setXsDisplayCount(prev => prev + itemsPerPage)
  }

  // For xs screens, use xsDisplayCount; for larger screens, use pagination
  const displayedDestinationsXs = sortedDestinations.slice(0, xsDisplayCount)

  const openMenu = () => {
    setIsMenuButtonAnimating(true)
    setTimeout(() => {
      setIsMenuButtonVisible(false)
      setIsMenuOpen(true)
      setTimeout(() => {
        setIsDrawerAnimating(false)
      }, 50)
    }, 150)
  }

  const closeMenu = () => {
    setIsDrawerAnimating(true)
    setTimeout(() => {
      setIsMenuOpen(false)
      setTimeout(() => {
        setIsMenuButtonVisible(true)
        setIsMenuButtonAnimating(true)
        setTimeout(() => {
          setIsMenuButtonAnimating(false)
        }, 50)
      }, 50)
    }, 150)
  }

  // Recent destinations carousel data (first 8 destinations)
  const recentPlaces = useMemo(() => {
    if (!destinations.length) return []
    return destinations
      .slice(0, 8)
      .map(destination => ({
        id: destination.id,
        name: destination.name,
        nameCN: destination.nameCN,
        date: destination.date,
        journeyName: destination.journeyName,
        journeyNameCN: destination.journeyNameCN,
        image: destination.images && destination.images.length > 0 ? destination.images[0] : ''
      }))
  }, [destinations])

  const nextRecentDestSlide = () => {
    setIsRecentDestTransitioning(true)
    setTimeout(() => {
      setCurrentRecentDestSlide((prev) => (prev + 1) % recentPlaces.length)
      setIsRecentDestTransitioning(false)
    }, 150)
  }

  const prevRecentDestSlide = () => {
    setIsRecentDestTransitioning(true)
    setTimeout(() => {
      setCurrentRecentDestSlide((prev) => (prev - 1 + recentPlaces.length) % recentPlaces.length)
      setIsRecentDestTransitioning(false)
    }, 150)
  }

  if (isLoading) {
    return (
      <>
      <style jsx>{`
        @keyframes moveRight {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: rvw(32, 32),
          backgroundImage: 'url(/images/backgrounds/homepage_background_2.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
          animation: { xs: 'moveRight 20s linear infinite', md: 'moveRight 60s linear infinite' }
        }}
      >
        {/* Spinner */}
        <Box
          sx={{
            width: rvw(60, 60),
            height: rvw(60, 60),
            borderWidth: rvw(6, 6),
            borderStyle: 'solid' as const,
            borderColor: 'rgba(240, 96, 1, 0.2)',
            borderTopColor: '#F06001',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        {/* Loading text */}
        <Box sx={{ fontFamily: locale === 'zh' ? 'MarioFontTitleChinese, sans-serif' : 'MarioFontTitle, sans-serif', fontSize: rvw(32, 32), color: '#373737', margin: 0 }}>
          {tr.loadingDestinations}
        </Box>
      </Box>
    </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        .destination-search-input::placeholder {
          color: #F6F6F6;
        }
        @keyframes moveRight {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        @keyframes slide-in {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-in-out forwards;
        }
      `}</style>
      <ViewHintsDrawer
        isOpen={isViewHintsDrawerOpen}
        onClose={() => setIsViewHintsDrawerOpen(false)}
      />
      {/* Map Filter Drawers */}
      <FilterByHomeDrawer
        isOpen={isFilterByHomeDrawerOpen && isMapFiltersContext}
        onClose={() => setIsFilterByHomeDrawerOpen(false)}
        onFilterChange={handleMapHomeFilterChange}
        selectedFilter={selectedMapHomeFilter}
      />
      <DestinationGroupSizeFilterDrawer
        isOpen={isGroupSizeFilterDrawerOpen && isMapFiltersContext}
        onClose={() => setIsGroupSizeFilterDrawerOpen(false)}
        onFilterChange={handleMapGroupSizeFilterChange}
        selectedFilter={selectedMapGroupSizeFilter}
      />
      <OtherFiltersDrawer
        isOpen={isOtherFiltersDrawerOpen && isMapFiltersContext}
        onClose={() => setIsOtherFiltersDrawerOpen(false)}
        onFilterChange={handleMapOtherFilterChange}
        selectedFilter={selectedMapOtherFilter}
      />

      {/* List Filter Drawers */}
      <FilterByHomeDrawer
        isOpen={isFilterByHomeDrawerOpen && !isMapFiltersContext}
        onClose={() => setIsFilterByHomeDrawerOpen(false)}
        onFilterChange={handleListHomeFilterChange}
        selectedFilter={selectedListHomeFilter}
      />
      <DestinationGroupSizeFilterDrawer
        isOpen={isGroupSizeFilterDrawerOpen && !isMapFiltersContext}
        onClose={() => setIsGroupSizeFilterDrawerOpen(false)}
        onFilterChange={handleListGroupSizeFilterChange}
        selectedFilter={selectedListGroupSizeFilter}
      />
      <OtherFiltersDrawer
        isOpen={isOtherFiltersDrawerOpen && !isMapFiltersContext}
        onClose={() => setIsOtherFiltersDrawerOpen(false)}
        onFilterChange={handleListOtherFilterChange}
        selectedFilter={selectedListOtherFilter}
      />
      <FilterDrawerBase
        isOpen={isNoResultsDrawerOpen}
        onClose={() => setIsNoResultsDrawerOpen(false)}
        titleEn="Oh no..."
        titleZh="哎呀..."
        showOkButton={true}
      >
        <MixedText
          text={locale === 'zh' ? '没有符合条件的结果。' : 'There is no matching result.'}
          chineseFont="MarioFontChinese, sans-serif"
          englishFont="MarioFont, sans-serif"
          fontSize={rvw(18, 20)}
          color="#373737"
          component="p"
          sx={{ textAlign: 'center', marginBottom: rvw(32, 32) }}
        />
      </FilterDrawerBase>
      <NavigationMenu
        isMenuOpen={isMenuOpen}
        isMenuButtonVisible={isMenuButtonVisible}
        isDrawerAnimating={isDrawerAnimating}
        isMenuButtonAnimating={isMenuButtonAnimating}
        openMenu={openMenu}
        closeMenu={closeMenu}
        currentPage="destinations"
      />

      {/* Station Page Title - Full Width */}
      <Box className="w-full">
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/destination_page_title_${locale}.jpg`}
          alt="Stations"
          className="w-full h-auto object-cover"
          sx={{ display: { xs: 'none', md: 'block' } }}
        />
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/destination_page_title_xs_${locale}.jpg`}
          alt="Stations"
          className="w-full h-auto object-cover"
          sx={{ display: { xs: 'block', md: 'none' } }}
        />
      </Box>

      {/* Recent Destinations Carousel Section */}
      {recentPlaces.length > 0 && (
      <Box
        component="section"
        className="w-full"
        sx={{
          paddingTop: rvw(48, 96),
          paddingBottom: rvw(48, 96),
          backgroundImage: 'url(/images/backgrounds/homepage_background_2.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
          animation: { xs: 'moveRight 20s linear infinite', md: 'moveRight 60s linear infinite' },
        }}
      >
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          {/* Desktop: Title and Description */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
            <MixedText
              text={locale === 'zh' ? '最新足迹' : 'Recent Destinations'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(64)}
              color="#373737"
              component="h2"
              sx={{
                margin: 0,
                marginBottom: vw(16)
              }}
            />
            <MixedText
              text={locale === 'zh' ? '来看我最近几次的旅游目的地吧！' : 'Check out the destinations I visited most recently!'}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={vw(28)}
              color="#373737"
              component="p"
              sx={{ margin: 0, textAlign: 'center' }}
            />
          </Box>

          {/* Mobile: Title and Description */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64, 'mobile'), marginTop: vw(16, 'mobile') }}>
            <MixedText
              text={locale === 'zh' ? '最新足迹' : 'Recent Destinations'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(40, 'mobile')}
              color="#373737"
              component="h3"
              sx={{
                margin: 0,
                marginBottom: vw(8, 'mobile')
              }}
            />
            <MixedText
              text={locale === 'zh' ? '来看我最近几次的旅游目的地吧！' : 'Check out the destinations I visited most recently!'}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={vw(16, 'mobile')}
              color="#373737"
              component="p"
              sx={{
                margin: 0,
                textAlign: 'center',
                paddingX: vw(16, 'mobile')
              }}
            />
          </Box>

          {/* XS Layout - Card Style */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'relative', width: '100vw', left: '50%', marginLeft: '-50vw', minHeight: vw(500, 'mobile'), zIndex: 10, padding: 0 }}>
            <Box sx={{ position: 'relative', width: '100vw', margin: '0', padding: '0', display: 'flex', flexDirection: 'column-reverse', overflow: 'visible' }}>
              {/* Destination Image */}
              <Box
                sx={{
                  position: 'relative',
                  width: '75%',
                  aspectRatio: '1',
                  borderRadius: vw(20, 'mobile'),
                  overflow: 'hidden',
                  zIndex: 10,
                  boxShadow: `0 ${vw(4, 'mobile')} ${vw(6, 'mobile')} rgba(0, 0, 0, 0.1)`,
                  marginTop: vw(-48, 'mobile'),
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                <Box
                  component="img"
                  src={recentPlaces[currentRecentDestSlide]?.image || ''}
                  alt={recentPlaces[currentRecentDestSlide]?.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>

              {/* Card Background */}
              <Box sx={{ position: 'relative', zIndex: 5 }}>
                <Box
                  component="img"
                  src="/images/destinations/hints/map_view_hint_card_xs_1.webp"
                  alt="Card"
                  sx={{ width: '100vw', height: 'auto', display: 'block' }}
                />
              </Box>

              {/* Title Section */}
              <Box sx={{ position: 'absolute', top: '0%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', overflow: 'visible', zIndex: 15 }}>
                <Box
                  component="img"
                  src="/images/destinations/hints/map_view_hint_title.webp"
                  alt="Location"
                  sx={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <MixedText
                  text={locale === 'zh' && recentPlaces[currentRecentDestSlide]?.nameCN ? recentPlaces[currentRecentDestSlide]?.nameCN : recentPlaces[currentRecentDestSlide]?.name || ''}
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={vw(28, 'mobile')}
                  color="#FFD701"
                  component="h3"
                  sx={{
                    margin: 0,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    width: '100%'
                  }}
                />
              </Box>

              {/* Date */}
              <Box sx={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', textAlign: 'center', zIndex: 15 }}>
                <Box component="p" sx={{ fontFamily: locale === 'zh' ? 'MarioFontChinese, sans-serif' : 'MarioFont, sans-serif', fontSize: vw(16, 'mobile'), color: '#373737', marginBottom: 0, marginTop: 0, lineHeight: '1.4' }}>
                  {recentPlaces[currentRecentDestSlide]?.date || ''}
                </Box>
              </Box>

              {/* View Details Button */}
              <Link href={`/destinations/${recentPlaces[currentRecentDestSlide]?.id || ''}`}>
                <Box sx={{ position: 'absolute', top: '19%', left: '50%', transform: 'translate(-50%, -50%) scale(1.3)', zIndex: 15 }}>
                  <Box
                    component="img"
                    src={`/images/buttons/view_details_button_${locale}.png`}
                    alt="View Details"
                    className="w-auto hover:scale-105 transition-transform duration-200"
                    sx={{ height: vw(48, 'mobile'), objectFit: 'contain', display: 'block' }}
                  />
                </Box>
              </Link>
            </Box>

            {/* Navigation Arrows */}
            <Box
              component="button"
              onClick={prevRecentDestSlide}
              disabled={currentRecentDestSlide === 0}
              className={`group absolute left-0 transition-transform duration-200 ${currentRecentDestSlide === 0 ? 'opacity-40' : 'cursor-pointer'}`}
              sx={{ zIndex: 30, top: '50%', transform: 'translateY(-50%)' }}
            >
              <Box
                component="img"
                src="/images/buttons/tab_prev.webp"
                alt="Previous"
                className={`w-auto ${currentRecentDestSlide === 0 ? '' : 'group-hover:hidden'}`}
                sx={{ height: vw(96, 'mobile') }}
              />
              {currentRecentDestSlide !== 0 && (
                <Box
                  component="img"
                  src="/images/buttons/tab_prev_hover.webp"
                  alt="Previous"
                  className="w-auto hidden group-hover:block"
                  sx={{ height: vw(96, 'mobile') }}
                />
              )}
            </Box>
            <Box
              component="button"
              onClick={nextRecentDestSlide}
              disabled={currentRecentDestSlide === recentPlaces.length - 1}
              className={`group absolute right-0 transition-transform duration-200 ${currentRecentDestSlide === recentPlaces.length - 1 ? 'opacity-40' : 'cursor-pointer'}`}
              sx={{ zIndex: 30, top: '50%', transform: 'translateY(-50%)' }}
            >
              <Box
                component="img"
                src="/images/buttons/tab_next.webp"
                alt="Next"
                className={`w-auto ${currentRecentDestSlide === recentPlaces.length - 1 ? '' : 'group-hover:hidden'}`}
                sx={{ height: vw(96, 'mobile') }}
              />
              {currentRecentDestSlide !== recentPlaces.length - 1 && (
                <Box
                  component="img"
                  src="/images/buttons/tab_next_hover.webp"
                  alt="Next"
                  className="w-auto hidden group-hover:block"
                  sx={{ height: vw(96, 'mobile') }}
                />
              )}
            </Box>

            {/* Slide Indicators */}
            <Box className="absolute left-1/2 -translate-x-1/2" sx={{ zIndex: 25, bottom: vw(32, 'mobile') }}>
              <Box className="flex justify-center" sx={{ gap: vw(8, 'mobile') }}>
                {recentPlaces.map((_, index) => (
                  <Box
                    key={index}
                    component="button"
                    onClick={() => setCurrentRecentDestSlide(index)}
                    className={`rounded-full transition-colors duration-200 ${
                      index === currentRecentDestSlide ? 'bg-[#373737]' : 'bg-[#373737]/30'
                    }`}
                    sx={{ width: vw(12, 'mobile'), height: vw(12, 'mobile') }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* MD+ Layout - Desktop Carousel */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'relative',
              width: '100vw',
              left: '50%',
              marginLeft: '-50vw',
              marginTop: vw(32),
              aspectRatio: '1920/800'
            }}
          >
            {/* Background */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/images/backgrounds/destination_background.webp)',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0,
              }}
            />

            {/* Masked destination image - left edge */}
            <Box sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 25 }}>
              <Box
                className={`transition-transform duration-300 ease-in-out ${
                  isRecentDestTransitioning ? '-translate-x-full' : 'translate-x-0'
                }`}
                sx={{
                  width: vw(768),
                  height: vw(768),
                  backgroundImage: `url(${recentPlaces[currentRecentDestSlide]?.image || ''})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  WebkitMaskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                  maskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center'
                }}
              />
              {isRecentDestTransitioning && (
                <Box
                  className="absolute top-0 left-0 transition-transform duration-300 ease-in-out -translate-x-full animate-slide-in"
                  sx={{
                    width: vw(768),
                    height: vw(768),
                    backgroundImage: `url(${recentPlaces[currentRecentDestSlide]?.image || ''})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    WebkitMaskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                    maskImage: 'url(/images/masks/homepage_journey_image_mask.webp)',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center'
                  }}
                />
              )}
            </Box>

            {/* Destination Card Overlay */}
            <Box
              className="absolute top-1/2 -translate-y-1/3"
              sx={{
                left: vw(250),
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: vw(24)
              }}
            >
              <Box sx={{ position: 'relative', width: vw(1100) }}>
                <Box
                  component="img"
                  src="/images/destinations/destination_popup_card.webp"
                  alt="Card"
                  sx={{ width: vw(1100), height: 'auto', display: 'block' }}
                />
                <Box sx={{ position: 'absolute', top: '0%', left: '70%', transform: 'translate(-50%, -50%)', width: '65%' }}>
                  <Box
                    component="img"
                    src="/images/destinations/destination_location_title_black.webp"
                    alt="Location"
                    sx={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                  <MixedText
                    text={locale === 'zh' && recentPlaces[currentRecentDestSlide]?.nameCN ? recentPlaces[currentRecentDestSlide]?.nameCN : recentPlaces[currentRecentDestSlide]?.name || ''}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(40)}
                    color="#FFD701"
                    component="h3"
                    sx={{
                      margin: 0,
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      width: '100%'
                    }}
                  />
                </Box>
                <Box sx={{ position: 'absolute', top: '60%', left: '70%', transform: 'translate(-50%, -50%)', width: '50%', textAlign: 'center' }}>
                  <Box component="p" sx={{ fontFamily: `${locale === 'zh' ? 'MarioFontChinese' : 'MarioFont'}, sans-serif`, fontSize: vw(28), color: '#373737', marginBottom: vw(4), marginTop: 0 }}>
                    {locale === 'zh' && recentPlaces[currentRecentDestSlide]?.journeyNameCN ? recentPlaces[currentRecentDestSlide]?.journeyNameCN : recentPlaces[currentRecentDestSlide]?.journeyName || ''}
                  </Box>
                  <Box component="p" sx={{ fontFamily: `${locale === 'zh' ? 'MarioFontChinese' : 'MarioFont'}, sans-serif`, fontSize: vw(26), color: '#373737', marginBottom: 0, marginTop: 0 }}>
                    {recentPlaces[currentRecentDestSlide]?.date || ''}
                  </Box>
                </Box>
              </Box>
              <Box
                component="a"
                href={`/destinations/${recentPlaces[currentRecentDestSlide]?.id || ''}`}
                className="inline-block hover:scale-105 transition-transform duration-200"
                sx={{ marginLeft: vw(400) }}
              >
                <Box
                  component="img"
                  src={`/images/buttons/view_details_button_${locale}.png`}
                  alt="View Details"
                  sx={{ height: vw(70), width: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </Box>
            </Box>

            {/* Navigation Arrows */}
            <Box
              component="button"
              onClick={prevRecentDestSlide}
              disabled={currentRecentDestSlide === 0}
              className={`group absolute top-1/2 -translate-y-1/2 transition-transform duration-200 ${currentRecentDestSlide === 0 ? 'opacity-40' : 'hover:scale-110'}`}
              sx={{ zIndex: 30, left: vw(32), padding: vw(24) }}
            >
              <Box component="img" src="/images/buttons/arrow_prev.webp" alt="Previous" className={`${currentRecentDestSlide === 0 ? '' : 'group-hover:hidden'}`} sx={{ width: vw(64), height: vw(64) }} />
              <Box component="img" src="/images/buttons/arrow_prev_hover.webp" alt="Previous" className={`${currentRecentDestSlide === 0 ? 'hidden' : 'hidden group-hover:block'}`} sx={{ width: vw(64), height: vw(64) }} />
            </Box>
            <Box
              component="button"
              onClick={nextRecentDestSlide}
              disabled={currentRecentDestSlide === recentPlaces.length - 1}
              className={`group absolute top-1/2 -translate-y-1/2 transition-transform duration-200 ${currentRecentDestSlide === recentPlaces.length - 1 ? 'opacity-40' : 'hover:scale-110'}`}
              sx={{ zIndex: 30, right: vw(32), padding: vw(24) }}
            >
              <Box component="img" src="/images/buttons/arrow_next.webp" alt="Next" className={`${currentRecentDestSlide === recentPlaces.length - 1 ? '' : 'group-hover:hidden'}`} sx={{ width: vw(64), height: vw(64) }} />
              <Box component="img" src="/images/buttons/arrow_next_hover.webp" alt="Next" className={`${currentRecentDestSlide === recentPlaces.length - 1 ? 'hidden' : 'hidden group-hover:block'}`} sx={{ width: vw(64), height: vw(64) }} />
            </Box>

            {/* Slide Indicators */}
            <Box className="absolute left-1/2 -translate-x-1/2" sx={{ zIndex: 25, bottom: vw(32) }}>
              <Box className="flex justify-center" sx={{ gap: vw(8) }}>
                {recentPlaces.map((_, index) => (
                  <Box
                    key={index}
                    component="button"
                    onClick={() => setCurrentRecentDestSlide(index)}
                    className={`rounded-full transition-colors duration-200 ${
                      index === currentRecentDestSlide ? 'bg-[#373737]' : 'bg-[#373737]/30'
                    }`}
                    sx={{ width: vw(12), height: vw(12) }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      )}

      {/* Map View Section */}
      <Box
        component="section"
        className="w-full"
        sx={{
          paddingTop: rvw(48, 96),
          paddingBottom: rvw(48, 96),
          backgroundImage: 'url(/images/destinations/destination_page_map_background.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: { xs: `${vw(300, 'mobile')} auto`, md: `${vw(300)} auto` },
        }}
      >
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          {/* Desktop title */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', marginTop: vw(32), marginBottom: vw(64) }}>
            <MixedText
              text={tr.destinationsMapView}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(64)}
              color="#F6F6F6"
              component="h2"
              sx={{
                textShadow: `${vw(3)} ${vw(3)} 0px #373737`,
                margin: 0
              }}
            />
          </Box>
          {/* Mobile title */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: vw(16, 'mobile'), marginBottom: vw(32, 'mobile'), textAlign: 'center' }}>
            <div style={{ lineHeight: '0.8' }}>
              <MixedText
                text={locale === 'zh' ? tr.destinationsMapView : 'Destinations'}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={vw(40, 'mobile')}
                color="#F6F6F6"
                component="h2"
                sx={{
                  textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                  margin: 0,
                  lineHeight: 0.8
                }}
              />
              {locale === 'en' && (
                <MixedText
                  text="Map"
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={vw(40, 'mobile')}
                  color="#F6F6F6"
                  component="h2"
                  sx={{
                    textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                    margin: 0,
                    lineHeight: 0.8
                  }}
                />
              )}
            </div>
          </Box>

          {/* View Hints Button - Mobile Only */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', marginBottom: vw(48, 'mobile') }}>
            <button
              onClick={() => setIsViewHintsDrawerOpen(true)}
              className="hover:scale-105 transition-transform duration-200"
            >
              <img
                src={`/images/buttons/view_hints_button_${locale}.png`}
                alt="View Hints"
                style={{ height: vw(64, 'mobile'), width: 'auto' }}
              />
            </button>
          </Box>

          {/* View Hints Button - Desktop Only */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', marginBottom: vw(48) }}>
            <button
              onClick={() => setIsViewHintsDrawerOpen(true)}
              className="hover:scale-105 transition-transform duration-200"
            >
              <img
                src={`/images/buttons/view_hints_button_${locale}.png`}
                alt="View Hints"
                style={{ height: vw(80), width: 'auto' }}
              />
            </button>
          </Box>

          {/* Map - Desktop and Mobile */}
          <Box sx={{ marginLeft: { xs: vw(-8, 'mobile'), md: 0 }, marginRight: { xs: vw(-8, 'mobile'), md: 0 } }}>
            <Box
              sx={{
                backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                backgroundRepeat: 'repeat',
                backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
                padding: rvw(8, 16),
                borderRadius: rvw(12, 24)
              }}
            >
              <InteractiveMap places={filteredMapDestinations} showHomeMarker={false} />
            </Box>
          </Box>

          {/* Filter Buttons - Mobile Only - Below Map */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', marginTop: vw(48, 'mobile'), width: '100%' }}>
            {/* Map Filters Label */}
            <MixedText
              text={locale === 'zh' ? '地图筛选条件' : 'Map Filters'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(24, 'mobile')}
              color="#F6F6F6"
              component="p"
              sx={{
                textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                margin: 0
              }}
            />
            <div
              className="flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                height: vw(100, 'mobile'),
                width: '100%',
                maxWidth: vw(400, 'mobile'),
                gap: vw(16, 'mobile')
              }}
            >
              {/* Filter by Home Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsMapFiltersContext(true)
                    setIsFilterByHomeDrawerOpen(true)
                  }}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={homeFilterIconMap[selectedMapHomeFilter] || homeFilterIconMap['all_destinations']}
                    alt={locale === 'zh' ? '用家的位置筛选' : 'Filter by Home Location'}
                    style={{
                      height: vw(64, 'mobile'),
                      width: 'auto',
                      filter: selectedMapHomeFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
              </div>

              {/* Filter by Group Size Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsMapFiltersContext(true)
                    setIsGroupSizeFilterDrawerOpen(true)
                  }}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={groupSizeFilterIconMap[selectedMapGroupSizeFilter] || groupSizeFilterIconMap['all_group_sizes']}
                    alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    style={{
                      height: vw(64, 'mobile'),
                      width: 'auto',
                      filter: selectedMapGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
              </div>

              {/* Other Filters Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsMapFiltersContext(true)
                    setIsOtherFiltersDrawerOpen(true)
                  }}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={otherFilterIconMap[selectedMapOtherFilter] || otherFilterIconMap['all_destinations']}
                    alt={locale === 'zh' ? '其他筛选方式' : 'Other Filters'}
                    style={{
                      height: vw(64, 'mobile'),
                      width: 'auto',
                      filter: selectedMapOtherFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
              </div>
            </div>
          </Box>

          {/* Filter Buttons - Desktop Only - Below Map */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', marginTop: vw(64) }}>
            {/* Map Filters Label */}
            <MixedText
              text={locale === 'zh' ? '地图筛选条件' : 'Map Filters'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(24)}
              color="#F6F6F6"
              component="p"
              sx={{
                textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                margin: 0,
                marginBottom: vw(8)
              }}
            />
            <div
              className="flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                height: vw(140),
                width: '100%',
                maxWidth: vw(900),
                gap: vw(32)
              }}
            >
              {/* Filter by Home Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsMapFiltersContext(true)
                    setIsFilterByHomeDrawerOpen(true)
                  }}
                  onMouseEnter={() => setIsFilterByHomeHovered(true)}
                  onMouseLeave={() => setIsFilterByHomeHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={homeFilterIconMap[selectedMapHomeFilter] || homeFilterIconMap['all_destinations']}
                    alt={locale === 'zh' ? '用家的位置筛选' : 'Filter by Home Location'}
                    style={{
                      height: vw(96),
                      width: 'auto',
                      filter: selectedMapHomeFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isFilterByHomeHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '用家的位置筛选' : 'Filter by Home Location'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#F6F6F6"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>

              {/* Filter by Group Size Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsMapFiltersContext(true)
                    setIsGroupSizeFilterDrawerOpen(true)
                  }}
                  onMouseEnter={() => setIsFilterByGroupSizeHovered(true)}
                  onMouseLeave={() => setIsFilterByGroupSizeHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={groupSizeFilterIconMap[selectedMapGroupSizeFilter] || groupSizeFilterIconMap['all_group_sizes']}
                    alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    style={{
                      height: vw(96),
                      width: 'auto',
                      filter: selectedMapGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isFilterByGroupSizeHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#F6F6F6"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>

              {/* Other Filters Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setIsMapFiltersContext(true)
                    setIsOtherFiltersDrawerOpen(true)
                  }}
                  onMouseEnter={() => setIsOtherFiltersHovered(true)}
                  onMouseLeave={() => setIsOtherFiltersHovered(false)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={otherFilterIconMap[selectedMapOtherFilter] || otherFilterIconMap['all_destinations']}
                    alt={locale === 'zh' ? '其他筛选方式' : 'Other Filters'}
                    style={{
                      height: vw(96),
                      width: 'auto',
                      filter: selectedMapOtherFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                    }}
                  />
                </button>
                {isOtherFiltersHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: vw(8),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MixedText
                      text={locale === 'zh' ? '其他筛选方式' : 'Other Filters'}
                      chineseFont="MarioFontTitleChinese, sans-serif"
                      englishFont="MarioFontTitle, sans-serif"
                      fontSize={vw(24)}
                      color="#F6F6F6"
                      component="p"
                      sx={{
                        textShadow: `${vw(2)} ${vw(2)} 0px #373737`,
                        margin: 0
                      }}
                    />
                  </Box>
                )}
              </div>
            </div>
          </Box>
        </Box>
      </Box>

      <Box
        component="section"
        ref={listSectionRef}
        className="w-full"
        sx={{
          paddingTop: rvw(48, 96),
          paddingBottom: rvw(48, 96),
          backgroundImage: 'url(/images/destinations/destination_page_list_background_shade.webp), url(/images/destinations/destination_page_list_background.webp)',
          backgroundRepeat: 'repeat-y, repeat',
          backgroundSize: { xs: `100% auto, ${vw(400, 'mobile')} auto`, md: `100% auto, ${vw(400)} auto` },
        }}
      >
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: rvw(32, 64), marginTop: rvw(16, 32) }}>
            <MixedText
              text={tr.listOfPlaces}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={rvw(40, 64)}
              color="#373737"
              component="h2"
              sx={{
                textShadow: rShadow(2, 3, '#F6F6F6'),
                margin: 0,
                marginBottom: rvw(16, 16)
              }}
            />
            <MixedText
              text={tr.clickToViewDetails}
              chineseFont="MarioFontChinese, sans-serif"
              englishFont="MarioFont, sans-serif"
              fontSize={rvw(16, 28)}
              color="#373737"
              component="p"
              sx={{ margin: 0 }}
            />
          </Box>

          {/* Search Bar - Desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', marginBottom: vw(32) }}>
            <div
              className="w-full flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/search_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                padding: `${vw(24)} ${vw(16)}`,
                height: vw(110),
                maxWidth: vw(672)
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'zh' ? '搜索目的地...' : 'Search places...'}
                className="destination-search-input"
                style={{
                  width: '100%',
                  padding: `${vw(12)} ${vw(12)} ${vw(12)} ${vw(96)}`,
                  fontSize: vw(24),
                  fontFamily: 'MarioFontTitle, MarioFontTitleChinese, sans-serif',
                  borderRadius: vw(8),
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#F6F6F6',
                  outline: 'none'
                }}
              />
            </div>
          </Box>

          {/* Filter Buttons - Desktop Only */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', marginBottom: vw(192) }}>
            {/* List Filters Label */}
            <MixedText
              text={locale === 'zh' ? '列表筛选条件' : 'List Filters'}
              chineseFont="MarioFontTitleChinese, sans-serif"
              englishFont="MarioFontTitle, sans-serif"
              fontSize={vw(24)}
              color="#373737"
              component="p"
              sx={{
                textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                margin: 0,
                marginBottom: vw(8)
              }}
            />
            <div
              className="flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                height: vw(140),
                width: '100%',
                maxWidth: vw(900),
                gap: vw(32)
              }}
            >
            {/* Filter by Home Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setIsMapFiltersContext(false)
                  setIsFilterByHomeDrawerOpen(true)
                }}
                onMouseEnter={() => setIsFilterByHomeHovered(true)}
                onMouseLeave={() => setIsFilterByHomeHovered(false)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={homeFilterIconMap[selectedListHomeFilter] || homeFilterIconMap['all_destinations']}
                  alt={locale === 'zh' ? '用家的位置筛选' : 'Filter by Home Location'}
                  style={{
                    height: vw(96),
                    width: 'auto',
                    filter: selectedListHomeFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                  }}
                />
              </button>
              {isFilterByHomeHovered && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: vw(8),
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MixedText
                    text={locale === 'zh' ? '用家的位置筛选' : 'Filter by Home Location'}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(24)}
                    color="#373737"
                    component="p"
                    sx={{
                      textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                      margin: 0
                    }}
                  />
                </Box>
              )}
            </div>

            {/* Filter by Group Size Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setIsMapFiltersContext(false)
                  setIsGroupSizeFilterDrawerOpen(true)
                }}
                onMouseEnter={() => setIsFilterByGroupSizeHovered(true)}
                onMouseLeave={() => setIsFilterByGroupSizeHovered(false)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={groupSizeFilterIconMap[selectedListGroupSizeFilter] || groupSizeFilterIconMap['all_group_sizes']}
                  alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                  style={{
                    height: vw(96),
                    width: 'auto',
                    filter: selectedListGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                  }}
                />
              </button>
              {isFilterByGroupSizeHovered && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: vw(8),
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MixedText
                    text={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(24)}
                    color="#373737"
                    component="p"
                    sx={{
                      textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                      margin: 0
                    }}
                  />
                </Box>
              )}
            </div>

            {/* Other Filters Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setIsMapFiltersContext(false)
                  setIsOtherFiltersDrawerOpen(true)
                }}
                onMouseEnter={() => setIsOtherFiltersHovered(true)}
                onMouseLeave={() => setIsOtherFiltersHovered(false)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={otherFilterIconMap[selectedListOtherFilter] || otherFilterIconMap['all_destinations']}
                  alt={locale === 'zh' ? '其他筛选方式' : 'Other Filters'}
                  style={{
                    height: vw(96),
                    width: 'auto',
                    filter: selectedListOtherFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                  }}
                />
              </button>
              {isOtherFiltersHovered && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: vw(8),
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MixedText
                    text={locale === 'zh' ? '其他筛选方式' : 'Other Filters'}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={vw(24)}
                    color="#373737"
                    component="p"
                    sx={{
                      textShadow: `${vw(2)} ${vw(2)} 0px #F6F6F6`,
                      margin: 0
                    }}
                  />
                </Box>
              )}
            </div>
            </div>
          </Box>

          {/* Search Bar - Mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', marginBottom: vw(16, 'mobile') }}>
            <div
              className="w-full flex justify-center items-center"
              style={{
                backgroundImage: 'url(/images/backgrounds/search_background_short.png)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                padding: vw(16, 'mobile'),
                maxWidth: vw(672, 'mobile')
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'zh' ? '搜索目的地...' : 'Search places...'}
                className="destination-search-input"
                style={{
                  width: '100%',
                  padding: `${vw(12, 'mobile')} ${vw(12, 'mobile')} ${vw(12, 'mobile')} ${vw(48, 'mobile')}`,
                  fontSize: vw(24, 'mobile'),
                  fontFamily: 'MarioFontTitle, MarioFontTitleChinese, sans-serif',
                  borderRadius: vw(8, 'mobile'),
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#F6F6F6',
                  outline: 'none'
                }}
              />
            </div>
          </Box>

          {/* Filter Buttons and Sort Button - Mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', alignItems: 'center', gap: vw(8, 'mobile'), marginBottom: vw(48, 'mobile') }}>
            {/* Filter Buttons Group - Icon Style */}
            <div className="flex flex-col items-center w-full">
              {/* List Filters Label */}
              <MixedText
                text={locale === 'zh' ? '列表筛选条件' : 'List Filters'}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={vw(24, 'mobile')}
                color="#373737"
                component="p"
                sx={{
                  textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #F6F6F6`,
                  margin: 0
                }}
              />
              <div
                className="flex justify-center items-center"
                style={{
                  backgroundImage: 'url(/images/backgrounds/filter_desktop_background.png)',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  height: vw(100, 'mobile'),
                  width: '100%',
                  maxWidth: vw(400, 'mobile'),
                  gap: vw(16, 'mobile')
                }}
              >
                {/* Filter by Home Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      setIsMapFiltersContext(false)
                      setIsFilterByHomeDrawerOpen(true)
                    }}
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    <img
                      src={homeFilterIconMap[selectedListHomeFilter] || homeFilterIconMap['all_destinations']}
                      alt={locale === 'zh' ? '用家的位置筛选' : 'Filter by Home Location'}
                      style={{
                        height: vw(64, 'mobile'),
                        width: 'auto',
                        filter: selectedListHomeFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                      }}
                    />
                  </button>
                </div>

                {/* Filter by Group Size Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      setIsMapFiltersContext(false)
                      setIsGroupSizeFilterDrawerOpen(true)
                    }}
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    <img
                      src={groupSizeFilterIconMap[selectedListGroupSizeFilter] || groupSizeFilterIconMap['all_group_sizes']}
                      alt={locale === 'zh' ? '用人数筛选' : 'Filter by Group Size'}
                      style={{
                        height: vw(64, 'mobile'),
                        width: 'auto',
                        filter: selectedListGroupSizeFilter !== 'all_group_sizes' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                      }}
                    />
                  </button>
                </div>

                {/* Other Filters Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => {
                      setIsMapFiltersContext(false)
                      setIsOtherFiltersDrawerOpen(true)
                    }}
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    <img
                      src={otherFilterIconMap[selectedListOtherFilter] || otherFilterIconMap['all_destinations']}
                      alt={locale === 'zh' ? '其他筛选方式' : 'Other Filters'}
                      style={{
                        height: vw(64, 'mobile'),
                        width: 'auto',
                        filter: selectedListOtherFilter !== 'all_destinations' ? 'brightness(1.2) drop-shadow(0 0 8px #FFD701)' : 'none'
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Box>

          {/* Empty State - When no results */}
          {sortedDestinations.length === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: rvw(96, 96), paddingBottom: rvw(96, 96) }}>
              <MixedText
                text={tr.noResults}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={rvw(32, 48)}
                color="#373737"
                component="h2"
                sx={{
                  textShadow: rShadow(2, 3, '#F6F6F6'),
                  margin: 0,
                  marginBottom: rvw(16, 16),
                  textAlign: 'center'
                }}
              />
              <MixedText
                text={tr.noMatchingResult}
                chineseFont="MarioFontChinese, sans-serif"
                englishFont="MarioFont, sans-serif"
                fontSize={rvw(16, 24)}
                color="#373737"
                component="p"
                sx={{ margin: 0, textAlign: 'center' }}
              />
            </Box>
          )}

          {/* Destinations Grid - Desktop with pagination */}
          {sortedDestinations.length > 0 && (
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '1fr', gap: vw(192) }}>
              {displayedDestinations.map((destination, index) => (
                <DestinationCard key={destination.id} station={destination} index={index} />
              ))}
            </Box>
          )}

          {/* Destinations Grid - XS with show more */}
          {sortedDestinations.length > 0 && (
            <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr', gap: vw(48, 'mobile') }}>
              {displayedDestinationsXs.map((destination, index) => (
                <DestinationCard key={destination.id} station={destination} index={index} />
              ))}
            </Box>
          )}

          {/* Show More Button - XS only */}
          {xsDisplayCount < sortedDestinations.length && (
            <Box sx={{ marginTop: vw(48, 'mobile'), display: { xs: 'flex', md: 'none' }, justifyContent: 'center' }}>
              <button
                onClick={handleShowMore}
                className="hover:scale-105 transition-transform duration-200"
              >
                <img
                  src={`/images/buttons/show_more_xs_${locale}.png`}
                  alt="Show more"
                  style={{ height: vw(48, 'mobile'), width: 'auto' }}
                />
              </button>
            </Box>
          )}

        {/* Pagination - Desktop only */}
        {totalPages > 1 && (
          <Box sx={{ marginTop: vw(192), display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
            <Box
              sx={{
                backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                backgroundRepeat: 'repeat',
                backgroundSize: `${vw(200)} auto`,
                padding: vw(8),
                borderRadius: vw(16)
              }}
            >
              <Box
                sx={{
                  borderWidth: vw(2),
                  borderStyle: 'solid',
                  borderColor: '#F6F6F6',
                  borderRadius: vw(12),
                  padding: vw(24),
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${vw(200)} auto`
                }}
              >
                {/* Page Info */}
                <MixedText
                  text={tr.pageOfPages(currentPage, totalPages)}
                  chineseFont="MarioFontTitleChinese, sans-serif"
                  englishFont="MarioFontTitle, sans-serif"
                  fontSize={vw(24)}
                  color="#F6F6F6"
                  component="p"
                  sx={{ textAlign: 'center', marginBottom: vw(32) }}
                />

                {/* Pagination Controls */}
                <div className="flex justify-center items-center" style={{ gap: vw(16) }}>
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`group transition-transform duration-200 ${currentPage === 1 ? 'opacity-40' : 'hover:scale-105 cursor-pointer'}`}
              >
                <img
                  src="/images/buttons/arrow_prev.webp"
                  alt={tr.previous}
                  className={`${currentPage === 1 ? '' : 'group-hover:hidden'}`}
                  style={{ width: vw(64), height: vw(64) }}
                />
                <img
                  src="/images/buttons/arrow_prev_hover.webp"
                  alt={tr.previous}
                  className={`${currentPage === 1 ? 'hidden' : 'hidden group-hover:block'}`}
                  style={{ width: vw(64), height: vw(64) }}
                />
              </button>

              {/* Page Numbers */}
              <div className="flex" style={{ gap: vw(8) }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)

                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={page}
                          style={{ fontFamily: 'MarioFontTitle, sans-serif', fontSize: vw(24), color: '#F6F6F6', paddingLeft: vw(8), paddingRight: vw(8) }}
                        >
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      style={{ fontFamily: 'MarioFontTitle, sans-serif', fontSize: vw(24), width: vw(56), paddingTop: vw(8), paddingBottom: vw(8), borderRadius: vw(8), borderWidth: currentPage === page ? vw(2) : '0', borderStyle: 'solid', borderColor: currentPage === page ? '#F6F6F6' : 'transparent' }}
                      className={`transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-[#373737] text-white'
                          : 'bg-[#F6F6F6] text-[#373737] hover:bg-[#FFD701]'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`group transition-transform duration-200 ${currentPage === totalPages ? 'opacity-40' : 'hover:scale-105 cursor-pointer'}`}
              >
                <img
                  src="/images/buttons/arrow_next.webp"
                  alt={tr.next}
                  className={`${currentPage === totalPages ? '' : 'group-hover:hidden'}`}
                  style={{ width: vw(64), height: vw(64) }}
                />
                <img
                  src="/images/buttons/arrow_next_hover.webp"
                  alt={tr.next}
                  className={`${currentPage === totalPages ? 'hidden' : 'hidden group-hover:block'}`}
                  style={{ width: vw(64), height: vw(64) }}
                />
              </button>
            </div>
              </Box>
            </Box>
          </Box>
        )}

        </Box>
      </Box>

      <Footer currentPage="destinations" />
    </div>
  )
}
