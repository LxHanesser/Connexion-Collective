import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '瞎写一些东西？',
    Svg: require('@site/static/img/game-icon-1.svg').default,
    description: (
      <>
        这里有我瞎写的一些东西，大部分可能是没有任何意义也不保证正确和真实性的胡诌，请谨慎辨别？
      </>
    ),
  },
  {
    title: 'Nullius in verba',
    Svg: require('@site/static/img/game-icon-2.svg').default,
    description: (
      <>
        最重要的不是知识的多少，而是辨别能力？
      </>
    ),
  },
  {
    title: '这里没有彩蛋',
    Svg: require('@site/static/img/game-icon-3.svg').default,
    description: (
      <>
        There are no Easter Eggs up here. Go away.
      </>
    ),
  },
];

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
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}