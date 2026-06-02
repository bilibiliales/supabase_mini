import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
/*
router.beforeEach(async (to, from, next) => {
  console.log('进入守卫', to.path)

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession()

    console.log('session=', session)

    if (to.meta.requiresAuth && !session) {
      next('/login')
    } else if (to.path === '/login' && session) {
      next('/profile')
    } else {
      next()
    }
  } catch (e) {
    console.error('路由守卫异常', e)

    next()
  }
})
*/

export default router
