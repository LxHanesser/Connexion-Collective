import clsx from 'clsx';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const ICONS = [
  require('@site/static/img/game-icon-1.svg').default,
  require('@site/static/img/game-icon-2.svg').default,
  require('@site/static/img/game-icon-3.svg').default,
];

const FEATURES = {
  zh: [
    {
      title: '瞎写一些东西？',
      description: '这里有我瞎写的一些东西，大部分可能是没有任何意义也不保证正确和真实性的胡诌，请谨慎辨别？',
    },
    {
      title: 'Nullius in verba',
      description: '最重要的不是知识的多少，而是辨别能力？',
    },
    {
      title: '这里没有彩蛋',
      description: 'There are no Easter Eggs up here. Go away.',
    },
  ],
  en: [
    {
      title: 'Random scribbles?',
      description:
        'Just things I write down. Most of it is probably meaningless and not guaranteed to be accurate — take it with a grain of salt.',
    },
    {
      title: 'Nullius in verba',
      description:
        'What matters is not how much you know, but whether you can tell what is true.',
    },
    {
      title: 'No easter eggs here',
      description: 'There are no Easter Eggs up here. Go away.',
    },
  ],
};

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col', 'col--4', styles.featureCol)}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  const {i18n} = useDocusaurusContext();
  const list = i18n.currentLocale === 'en' ? FEATURES.en : FEATURES.zh;

  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {list.map((feature, index) => (
            <Feature key={feature.title} Svg={ICONS[index]} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
