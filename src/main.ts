import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import HomeView from './views/HomeView.vue';
import TrashView from './views/TrashView.vue';
import ProjectView from './views/ProjectView.vue';
import ProjectTrashView from './views/ProjectTrashView.vue';
import CharactersView from './views/CharactersView.vue';
import TagsView from './views/TagsView.vue';
import RelationshipsView from './views/RelationshipsView.vue';
import TermsView from './views/TermsView.vue';
import PlotView from './views/PlotView.vue';
import EditorView from './views/EditorView.vue';
import './styles.css';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView },
    { path: '/trash', component: TrashView },
    { path: '/project/:projectId', component: ProjectView },
    { path: '/project/:projectId/trash', component: ProjectTrashView },
    { path: '/project/:projectId/characters', component: CharactersView },
    { path: '/project/:projectId/tags', component: TagsView },
    { path: '/project/:projectId/relationships', component: RelationshipsView },
    { path: '/project/:projectId/terms', component: TermsView },
    { path: '/project/:projectId/plot', component: PlotView },
    { path: '/project/:projectId/openings', redirect: to => `/project/${to.params.projectId}/plot` },
    { path: '/project/:projectId/editor', component: EditorView },
  ],
});

createApp(App).use(router).mount('#app');
