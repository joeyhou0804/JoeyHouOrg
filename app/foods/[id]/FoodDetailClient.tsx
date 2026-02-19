'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import { UtensilsCrossed, MapPin, Store } from 'lucide-react'
import dynamic from 'next/dynamic'
import Footer from 'src/components/Footer'
import NavigationMenu from 'src/components/NavigationMenu'
import ViewHintsDrawer from 'src/components/ViewHintsDrawer'
import MapViewHint from 'src/components/MapViewHint'
import ImageLightbox from 'src/components/ImageLightbox'
import { useTranslation } from 'src/hooks/useTranslation'
import MixedText from 'src/components/MixedText'
import type { Food } from '@/src/data/foods'
import { useRouter } from 'next/navigation'
import { formatDuration } from 'src/utils/formatDuration'
import { getRouteCoordinatesFromSegments } from 'src/utils/routeHelpers'
import { calculateRouteDisplay, calculateRouteDisplayCN } from 'src/utils/journeyHelpers'
import { vw, rvw, rShadow } from 'src/utils/scaling'

// Dynamically import the map component to avoid SSR issues
const InteractiveMap = dynamic(() => import('src/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        width: '100%',
        height: { xs: 'auto', md: vw(600) },
        aspectRatio: { xs: '2/3', md: 'unset' },
        borderRadius: rvw(8, 8),
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <p style={{ color: '#4b5563' }}>Loading map...</p>
    </Box>
  )
})

interface FoodDetailClientProps {
  food: Food | undefined
  destination?: any
  journey?: any
}

export default function FoodDetailClient({ food, destination, journey }: FoodDetailClientProps) {
  const { locale, tr } = useTranslation()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuButtonVisible, setIsMenuButtonVisible] = useState(true)
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false)
  const [isMenuButtonAnimating, setIsMenuButtonAnimating] = useState(false)
  const [isXsScreen, setIsXsScreen] = useState(false)

  // Detect xs screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsXsScreen(window.innerWidth < 768)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Preload title images and backgrounds
  useEffect(() => {
    const preloadImages = [
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/foods_details_title_${locale}.jpg`,
      `https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/foods_details_title_xs_${locale}.jpg`,
      '/images/backgrounds/homepage_background.webp',
      '/images/backgrounds/pattern-food-orange-2x.png',
      '/images/backgrounds/homepage_background_2.webp',
      '/images/destinations/destination_location_title.webp',
      '/images/destinations/destination_page_map_box_background.webp',
      '/images/destinations/destination_page_list_background.webp',
      '/images/destinations/destination_page_list_background_shade.webp'
    ]

    // Add food image if available
    if (food?.imageUrl) {
      preloadImages.push(food.imageUrl)
    }

    preloadImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [locale, food])
  const [isViewHintsDrawerOpen, setIsViewHintsDrawerOpen] = useState(false)
  const [viewHintsVariant, setViewHintsVariant] = useState<'default' | 'relatedJourney'>('default')
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [allDestinations, setAllDestinations] = useState<any[]>([])
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true)
  const [homeLocations, setHomeLocations] = useState<any[]>([])

  // Fetch all destinations for the journey
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const response = await fetch('/api/destinations')
        const data = await response.json()
        setAllDestinations(data)

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
        setIsLoadingDestinations(false)
      }
    }
    fetchDestinations()
  }, [])

  // Fetch home locations
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

  // Memoize map places for the restaurant location
  const mapPlaces = useMemo(() => {
    if (!food || !destination) return []
    return [{
      id: food.id,
      name: food.name,
      nameCN: food.nameCN,
      date: food.restaurantAddress || '', // Show restaurant address instead of date
      journeyName: food.restaurantName,
      journeyNameCN: food.restaurantName,
      state: destination.state,
      lat: food.coordinates.lat,
      lng: food.coordinates.lng,
      images: [food.imageUrl],
      restaurantName: food.restaurantName, // Mark as food to hide View Details
      restaurantAddress: food.restaurantAddress,
      cuisineStyle: food.cuisineStyle,
      cuisineStyleCN: food.cuisineStyleCN
    }]
  }, [food, destination])

  // Memoize journey places (all destinations in the journey for Related Journey section)
  const journeyPlaces = useMemo(() => {
    if (!journey || !destination) return []
    return allDestinations.filter(
      dest => dest.journeyName === destination.journeyName
    ).map((dest) => ({
      id: dest.id,
      name: dest.name,
      nameCN: dest.nameCN,
      date: dest.date,
      journeyName: dest.journeyName,
      journeyNameCN: dest.journeyNameCN,
      state: dest.state,
      images: dest.images || [],
      lat: dest.lat,
      lng: dest.lng
    }))
  }, [journey, destination, allDestinations])

  // Memoize journey route calculations
  const journeyRouteCoordinates = useMemo(() => {
    return getRouteCoordinatesFromSegments(journey?.segments)
  }, [journey?.segments])

  const journeyRoute = useMemo(() => {
    if (!journey) return ''

    // Use the same helper functions as the journey details page
    if (locale === 'zh') {
      return calculateRouteDisplayCN(journey, homeLocations)
    } else {
      return calculateRouteDisplay(journey, homeLocations)
    }
  }, [journey, locale, homeLocations])

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

  // Helper for Lucide icon sizes
  const iconSize = (px: number) => {
    if (typeof window === 'undefined') return px
    return isXsScreen
      ? Math.round(px * window.innerWidth / 390)
      : Math.round(px * window.innerWidth / 1512)
  }

  // Show loading state while data is being fetched
  if (isLoadingDestinations) {
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

      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rvw(24, 32),
        backgroundImage: 'url(/images/backgrounds/homepage_background_2.webp)',
        backgroundRepeat: 'repeat',
        backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
        animation: { xs: 'moveRight 20s linear infinite', md: 'moveRight 60s linear infinite' }
      }}>
        {/* Spinner */}
        <Box
          sx={{
            width: rvw(48, 60),
            height: rvw(48, 60),
            borderWidth: rvw(4, 6),
            borderStyle: 'solid',
            borderColor: 'rgba(240, 96, 1, 0.2)',
            borderTopColor: '#F06001',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        {/* Loading text */}
        <Box sx={{
          fontFamily: locale === 'zh' ? 'MarioFontTitleChinese, sans-serif' : 'MarioFontTitle, sans-serif',
          fontSize: rvw(24, 32),
          color: '#373737'
        }}>
          {tr.loading}
        </Box>
      </Box>
    </>
    )
  }

  if (!food) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{locale === 'zh' ? '未找到美食' : 'Food Not Found'}</h1>
          <Link href="/foods" className="text-blue-600 hover:text-blue-800">
            {locale === 'zh' ? '返回美食列表' : 'Back to Foods'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Box
      className="min-h-screen"
      sx={{
        backgroundImage: 'url(/images/destinations/destination_page_list_background_shade.webp), url(/images/destinations/destination_page_list_background.webp)',
        backgroundRepeat: 'repeat-y, repeat',
        backgroundSize: { xs: `100% auto, ${vw(400, 'mobile')} auto`, md: `100% auto, ${vw(400)} auto` },
      }}
    >
      <NavigationMenu
        isMenuOpen={isMenuOpen}
        isMenuButtonVisible={isMenuButtonVisible}
        isDrawerAnimating={isDrawerAnimating}
        isMenuButtonAnimating={isMenuButtonAnimating}
        openMenu={openMenu}
        closeMenu={closeMenu}
      />
      <ViewHintsDrawer
        isOpen={isViewHintsDrawerOpen}
        onClose={() => setIsViewHintsDrawerOpen(false)}
        variant={viewHintsVariant}
      />
      <ImageLightbox
        isOpen={isLightboxOpen}
        images={food ? [food.imageUrl] : []}
        currentIndex={0}
        onClose={() => setIsLightboxOpen(false)}
        onPrevious={() => {}}
        onNext={() => {}}
        alt={food?.name || 'Food'}
      />

      {/* Header Banner */}
      <Box sx={{ width: '100%' }}>
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_1920,f_auto,q_auto/joeyhoujournal/headers/foods_details_title_${locale}.jpg`}
          alt={locale === 'zh' ? '美食详情' : 'Food Details'}
          sx={{ width: '100%', height: 'auto', objectFit: 'cover', display: { xs: 'none', md: 'block' } }}
        />
        <Box
          component="img"
          src={`https://res.cloudinary.com/joey-hou-homepage/image/upload/w_800,f_auto,q_auto/joeyhoujournal/headers/foods_details_title_xs_${locale}.jpg`}
          alt={locale === 'zh' ? '美食详情' : 'Food Details'}
          sx={{ width: '100%', height: 'auto', objectFit: 'cover', display: { xs: 'block', md: 'none' } }}
        />
      </Box>

      {/* Related Journey Section - Desktop Only */}
      {journey && (
        <Box
          component="section"
          sx={{
            width: '100%',
            paddingTop: vw(96),
            paddingBottom: vw(96),
            display: { xs: 'none', md: 'block' },
            backgroundImage: 'url(/images/backgrounds/homepage_background.webp)',
            backgroundRepeat: 'repeat',
            backgroundSize: '100vw auto',
          }}
        >
          <Box sx={{ maxWidth: vw(1280), marginLeft: 'auto', marginRight: 'auto', paddingLeft: vw(32), paddingRight: vw(32) }}>
            {/* Title */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
              <MixedText
                text={locale === 'zh' ? '相关旅程' : 'Related Journey'}
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

            {/* View Hints Button - Desktop Only */}
            <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: vw(192), marginTop: vw(64) }}>
              <button
                onClick={() => {
                  setViewHintsVariant('relatedJourney')
                  setIsViewHintsDrawerOpen(true)
                }}
                className="hover:scale-105 transition-transform duration-200"
              >
                <Box
                  component="img"
                  src={`/images/buttons/view_hints_button_${locale}.png`}
                  alt="View Hints"
                  sx={{ height: vw(80), width: 'auto' }}
                />
              </button>
            </Box>

            <Box style={{ position: 'relative' }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${vw(200)} auto`,
                  padding: vw(16),
                  borderRadius: vw(24)
                }}
              >
                <InteractiveMap
                  places={journeyPlaces}
                  routeSegments={journey.segments}
                  routeCoordinates={journeyRouteCoordinates}
                  journeyDate={journey.startDate}
                  currentDestinationId={destination?.id}
                  allowViewDetailsForCurrent={true}
                />
              </Box>

              {/* Journey Info Card - Top Left Corner - Desktop Only */}
              <Box
                sx={{
                  position: 'absolute',
                  top: vw(-100),
                  left: vw(-600),
                  zIndex: 1000
                }}
              >
                <MapViewHint
                  imageOnRight={false}
                  cardNumber={3}
                  isJourneyInfo={true}
                  journeySlug={journey.slug}
                  station={{
                    id: '',
                    name: locale === 'zh' && journey.nameCN ? journey.nameCN : journey.name,
                    journeyName: journeyRoute,
                    date: formatDuration(journey.days, journey.nights, tr),
                    images: []
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Related Journey Section - Mobile Only */}
      {journey && (
        <Box
          component="section"
          sx={{
            display: { xs: 'block', md: 'none' },
            width: '100%',
            paddingTop: vw(48, 'mobile'),
            paddingBottom: vw(48, 'mobile'),
            backgroundImage: 'url(/images/backgrounds/homepage_background.webp)',
            backgroundRepeat: 'repeat',
            backgroundSize: '100vw auto',
          }}
        >
          <Box sx={{ maxWidth: 'none', marginLeft: 'auto', marginRight: 'auto', paddingLeft: vw(16, 'mobile'), paddingRight: vw(16, 'mobile') }}>
            {/* Mobile: Title */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(32, 'mobile'), marginTop: vw(16, 'mobile'), textAlign: 'center' }}>
              <MixedText
                text={locale === 'zh' ? '相关旅程' : 'Related Journey'}
                chineseFont="MarioFontTitleChinese, sans-serif"
                englishFont="MarioFontTitle, sans-serif"
                fontSize={vw(40, 'mobile')}
                color="#F6F6F6"
                component="h2"
                sx={{
                  textShadow: `${vw(2, 'mobile')} ${vw(2, 'mobile')} 0px #373737`,
                  margin: 0
                }}
              />
            </Box>

            {/* Mobile: View Hints Button */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: vw(48, 'mobile') }}>
              <button
                onClick={() => {
                  setViewHintsVariant('relatedJourney')
                  setIsViewHintsDrawerOpen(true)
                }}
                className="hover:scale-105 transition-transform duration-200"
              >
                <Box
                  component="img"
                  src={`/images/buttons/view_hints_button_${locale}.png`}
                  alt="View Hints"
                  sx={{ height: vw(64, 'mobile'), width: 'auto' }}
                />
              </button>
            </Box>

            {/* Journey Info Card - Above map */}
            <Box sx={{ marginTop: vw(80, 'mobile') }}>
              <MapViewHint
                imageOnRight={true}
                cardNumber={3}
                isJourneyInfo={true}
                journeySlug={journey.slug}
                station={{
                  id: '',
                  name: locale === 'zh' && journey.nameCN ? journey.nameCN : journey.name,
                  journeyName: journeyRoute,
                  date: formatDuration(journey.days, journey.nights, tr),
                  images: []
                }}
              />
            </Box>

            <Box sx={{ position: 'relative', marginLeft: vw(-8, 'mobile'), marginRight: vw(-8, 'mobile'), marginTop: vw(-24, 'mobile') }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${vw(200, 'mobile')} auto`,
                  padding: vw(8, 'mobile'),
                  borderRadius: vw(12, 'mobile')
                }}
              >
                <InteractiveMap
                  places={journeyPlaces}
                  routeSegments={journey.segments}
                  routeCoordinates={journeyRouteCoordinates}
                  journeyDate={journey.startDate}
                  currentDestinationId={destination?.id}
                  allowViewDetailsForCurrent={true}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ paddingTop: rvw(32, 32) }}>
        <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(16, 32), paddingRight: rvw(16, 32) }}>
          {/* Food Title */}
          <Box sx={{ width: '100%', maxWidth: { xs: 'none', md: vw(800) }, margin: { xs: `${vw(48, 'mobile')} auto ${vw(16, 'mobile')}`, md: `${vw(96)} auto ${vw(32)}` } }}>
            <Box sx={{ position: 'relative', width: '100%', marginBottom: rvw(16, 32) }}>
              <Box
                component="img"
                src="/images/destinations/destination_location_title.webp"
                alt="Location"
                sx={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <Box
                component="div"
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
              >
                {locale === 'zh' && food.nameCN ? (
                  <MixedText
                    text={food.nameCN}
                    chineseFont="MarioFontTitleChinese, sans-serif"
                    englishFont="MarioFontTitle, sans-serif"
                    fontSize={rvw(28, 48)}
                    color="#373737"
                    component="h1"
                    sx={{ margin: 0 }}
                  />
                ) : (
                  <Box component="h1" sx={{ fontFamily: 'MarioFontTitle, sans-serif', fontSize: rvw(28, 48), color: '#373737', margin: 0 }}>
                    {food.name}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Food Image */}
          <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: { xs: 0, md: vw(24) }, paddingRight: { xs: 0, md: vw(24) }, marginBottom: rvw(48, 144) }}>
            <Box sx={{ maxWidth: { xs: '100%', md: vw(800) }, margin: '0 auto', px: 0 }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
                  padding: rvw(8, 16),
                  borderRadius: rvw(12, 24),
                  mx: { xs: vw(-8, 'mobile'), md: 0 }
                }}
              >
                <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                  <Box
                    component="img"
                    src={food.imageUrl}
                    alt={food.name}
                    onClick={() => setIsLightboxOpen(true)}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: rvw(8, 16),
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)'
                      }
                    }}
                  />
                </Box>

                {/* Food Info Below Image */}
                <Box sx={{ padding: rvw(16, 32), display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: rvw(8, 16) }}>
                  {/* Restaurant Name */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: rvw(8, 8) }}>
                    <Store style={{ color: '#F6F6F6' }} size={iconSize(24)} />
                    <Box component="span" sx={{ fontFamily: 'MarioFont, sans-serif', fontSize: rvw(16, 20), color: '#F6F6F6' }}>
                      {food.restaurantName}
                    </Box>
                  </Box>
                  {/* Restaurant Address */}
                  {food.restaurantAddress && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: rvw(8, 8) }}>
                      <MapPin style={{ color: '#F6F6F6' }} size={iconSize(24)} />
                      <Box component="span" sx={{ fontFamily: 'MarioFont, sans-serif', fontSize: rvw(16, 20), color: '#F6F6F6' }}>
                        {food.restaurantAddress}
                      </Box>
                    </Box>
                  )}
                  {/* Cuisine Style */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: rvw(8, 8) }}>
                    <UtensilsCrossed style={{ color: '#F6F6F6' }} size={iconSize(24)} />
                    <Box component="span" sx={{ fontFamily: locale === 'zh' ? 'MarioFontChinese, sans-serif' : 'MarioFont, sans-serif', fontSize: rvw(16, 20), color: '#F6F6F6' }}>
                      {locale === 'zh' && food.cuisineStyleCN ? food.cuisineStyleCN : food.cuisineStyle}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Map View Section */}
        <Box
          component="section"
          sx={{
            width: '100%',
            paddingTop: rvw(48, 96),
            paddingBottom: rvw(48, 96),
            backgroundImage: 'url(/images/backgrounds/pattern-food-orange-2x.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: { xs: `${vw(300, 'mobile')} auto`, md: `${vw(300)} auto` },
          }}
        >
          <Box sx={{ maxWidth: { xs: 'none', md: vw(1280) }, marginLeft: 'auto', marginRight: 'auto', paddingLeft: rvw(8, 32), paddingRight: rvw(8, 32) }}>
            {/* Desktop title */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', marginBottom: vw(64), marginTop: vw(32) }}>
              <MixedText
                text={locale === 'zh' ? '餐厅位置' : 'Restaurant Location'}
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
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: vw(32, 'mobile'), marginTop: vw(16, 'mobile'), textAlign: 'center' }}>
              <div style={{ lineHeight: '0.8' }}>
                <MixedText
                  text={locale === 'zh' ? '餐厅位置' : 'Restaurant'}
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
                    text="Location"
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

            {/* View Hints Button - Desktop Only */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', marginTop: vw(64), marginBottom: vw(64) }}>
              <button
                onClick={() => setIsViewHintsDrawerOpen(true)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <Box
                  component="img"
                  src={`/images/buttons/view_hints_button_${locale}.png`}
                  alt="View Hints"
                  sx={{ height: vw(80), width: 'auto' }}
                />
              </button>
            </Box>

            {/* View Hints Button - Mobile Only */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', marginBottom: vw(48, 'mobile') }}>
              <button
                onClick={() => setIsViewHintsDrawerOpen(true)}
                className="hover:scale-105 transition-transform duration-200"
              >
                <Box
                  component="img"
                  src={`/images/buttons/view_hints_button_${locale}.png`}
                  alt="View Hints"
                  sx={{ height: vw(64, 'mobile'), width: 'auto' }}
                />
              </button>
            </Box>

            <Box sx={{ maxWidth: { xs: 'none', md: vw(800) }, margin: '0 auto' }}>
              <Box
                sx={{
                  backgroundImage: 'url(/images/destinations/destination_page_map_box_background.webp)',
                  backgroundRepeat: 'repeat',
                  backgroundSize: { xs: `${vw(200, 'mobile')} auto`, md: `${vw(200)} auto` },
                  padding: rvw(8, 16),
                  borderRadius: rvw(12, 24)
                }}
              >
                <InteractiveMap
                  places={mapPlaces}
                  isDetailView={true}
                  showHomeMarker={false}
                  initialCenter={{ lat: food.coordinates.lat, lng: food.coordinates.lng }}
                  initialZoom={15}
                  maxZoom={18}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Footer />
      </Box>
    </Box>
  )
}
